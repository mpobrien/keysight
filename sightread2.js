var React = require("react")
var ReactDOM = require("react-dom")
var Scale = require("./scale.js")
var _ = require("underscore")
var $ = require("jquery")
var Vex = require("vexflow")
var midiutils = require("./midiutils.js")
var Nav = require('react-bootstrap').Nav;
var NavItem = require('react-bootstrap').NavItem;
var MenuItem = require('react-bootstrap').MenuItem;
var NavDropdown = require('react-bootstrap').NavDropdown;
var css = require("./sightread.scss");
var teoria = require("teoria")

var scaleTypes = _.map(Scale.Types, function(obj){
  return {name:obj.name, steps:obj.steps}
})

function fixAccidental(x){
  x = x.replace(/♯/g, "#")
  x = x.replace(/♭/g, "b")
  return x
}

var MidiPlayerCallback = function(message){
  var data = message.data; 
  var eventtype = midiutils.eventType(data);
  console.log(eventtype)
  if(eventtype=="Note On"){
    MIDI.noteOn(0, data[1], 100, 0);
  }else if(eventtype=="Note Off"){
    MIDI.noteOff(0, data[1]);
  }
}
var diffState = function(a,b, anyVoicing){
  var aKeys = Object.keys(a)
  var bKeys = Object.keys(b)
  console.log("a, b", aKeys, bKeys)
  if(anyVoicing){
    aKeys = _.map(aKeys, Scale.noteOnly)
    bKeys = _.map(bKeys, Scale.noteOnly)
    a = objectifyChordNotes(aKeys)
    b = objectifyChordNotes(bKeys)
  }
  aKeys = _.map(aKeys, function(x){return x.toLowerCase()})
  bKeys = _.map(bKeys, function(x){return x.toLowerCase()})

  if(aKeys.length != bKeys.length){
    return false
  }
  for(var i=0;i<aKeys.length;i++){
    if(!(aKeys[i] in b) || a[aKeys[i]] != b[aKeys[i]]){
      return false
    }
  }
  return true
}

function generateChordSequence(typesAllowed, n){
  if(typesAllowed.length == 0){
    typesAllowed = ["major"];
  }
  var challenges = []
  for(var i=0;i<n;i++){
    // get a random chord form the set of allowed chord types
    var chordTypeName = _.sample(typesAllowed);
    var chordObj = Scale.chordTypeByName(chordTypeName);
    var rootNote = _.sample(Scale.scaleMaps.cMajor);
    var ns = _.map(chordObj.gen(_.indexOf(Scale.scaleMaps.cMajor, rootNote)), function(x){return x.toLowerCase()}) ;
    challenges.push({name: rootNote + chordObj.name, notes: ns});
  }
  return challenges
}

function generateScalePhrase(scale, length, numNotes){
  var out = [];
  var length = length || 4;
  if(!numNotes){
    numNotes = 1;
  }
  //if (!allowedIntervals){
    //allowedIntervals = []
    //}
    for(var i=0;i<length;i++){
      var nextKeySet = [];
      while(nextKeySet.length < numNotes){
        var filteredScale = _.filter(scale, function(x){return !_.contains(nextKeySet, x)});
        nextKeySet.push(_.sample(filteredScale));
      }

      /*
      // Logic for adding notes based on set of intervals relative to base note,
      // rather than choosing other notes within scale.
      if(allowedIntervals.length > 0){
      var interval = _.sample(allowedIntervals)
      var note = Scale.canonicalize(Scale.noteOnly(nextKey))
      //console.log("using interval", interval, nextKey, notes)
      var noteIndex = _.indexOf(Scale.notes, note) + interval
      // TODO assume that we never got further than into 
      // the 1st next octave above
      var octaveDiff = noteIndex > Scale.scaleMaps.cMajor.length ? 1 : 0;
      noteIndex = noteIndex % Scale.scaleMaps.cMajor.length
      var octave = parseInt(Scale.octaveOnly(nextKey))
      var note = Scale.noteOnly(nextKey)
      note = Scale.scaleMaps.cMajor[noteIndex]
      var intervalNote = note + "/" + (octave + octaveDiff).toString()
      nextKeySet.push(intervalNote.toLowerCase())
      }
      */
      out.push(nextKeySet)
    }
    return out
}

var objectifyChordNotes = function(ns){
  return _.object(ns, _.times(ns.length, _.constant(true)));
}


function ChordChallengeHandler(chordsSeq){
  this.chordsSeq = chordsSeq
  this.currentIndex = 0;
  this.noteState = {}
  this.correctState = objectifyChordNotes(chordsSeq[0].notes)
  var outer = this


  this.callback = function(message, onCorrect, onComplete){
    var data = message.data; 
    var eventtype = midiutils.eventType(data);
    if(!midiutils.getLetter(data)){
      return;
    }
    var note = midiutils.getLetter(data).toLowerCase() + "/" + parseInt(midiutils.getOctave(data)-1);
    if(eventtype=="Note On"){
      outer.noteState[note] = true;
    } else if(eventtype=="Note Off") {
      delete outer.noteState[note];
    }
    if(diffState(outer.correctState, outer.noteState, true)){
      if(outer.currentIndex==chordsSeq.length-1){
        onComplete()
      }else{
        if(onCorrect){
          onCorrect();
        }
        outer.currentIndex += 1;
        outer.correctState = objectifyChordNotes(chordsSeq[outer.currentIndex].notes);
      }
    }else{
      console.log("incorrect!");
    }
  }
}

function PhraseChallengeHandler(phrase, key, clef, intervals){
  this.phrase = phrase
  this.currentIndex = 0;
  this.key= key
  this.clef = clef
  this.noteState = {}
  var outer = this

  this.callback = function(message, onCorrect, onComplete){
    var data = message.data; 
    var eventtype = midiutils.eventType(data);
    if(!midiutils.getLetter(data)){
      return;
    }
    var note = midiutils.getLetter(data).toLowerCase() + "/" + parseInt(midiutils.getOctave(data)-1);
    if(eventtype=="Note On"){
      outer.noteState[note] = true;
      var correctState = {};
      if(typeof outer.phrase[outer.currentIndex] == typeof ""){
        correctState[outer.phrase[outer.currentIndex]] = true;
      }else{
        if(outer.currentIndex>=0 && outer.currentIndex < outer.phrase.length){
          outer.phrase[outer.currentIndex].forEach(function(x){
            correctState[x] = true;
          })
        }
      }
      if(diffState(correctState, outer.noteState)){
        outer.currentIndex+=1;
        if(onCorrect){
          onCorrect();
        }
        if(outer.currentIndex==outer.phrase.length){
          onComplete()
        }
      }else{
        console.log("incorrect!");
      }
    } else if(eventtype=="Note Off") {
      delete outer.noteState[note];
    }
  }
}



var SiteContainer = React.createClass(
  { 
    midiCallback : function(message){
      var cpt = this;
      if(cpt.state.exerciseType == "phrase"){
        this.state.challenge.callback(message, function(){
          cpt.refs.phrase.repaintCanvas();
        }, function(){
          cpt.resetPhrases(cpt.state.phraseFormValues)
        })
      }else{
        this.state.challenge.callback(message, function(){
          cpt.refs.chordChallengeList.incChordChallenge()
        }, function(){
          cpt.resetChords(cpt.state.chordFormValues)
          cpt.refs.chordChallengeList.resetCounter()
        })
      }
    },
    getInitialState:function(){
      var phrase = generateScalePhrase(Scale.generate("c/4", Scale.Types[0].steps, 1), 16);
      //var keySig = _.sample(Scale.scaleMaps.cMajor)
      var keySig = "C"
      var phraseFormValues =  { key:keySig, clef:"treble", scaleType:"Major", range:1, intervals:[]}
      var chordFormValues = {types:[""], chordChallengeType:"random"}
      return {exerciseType:"phrase", challenge:new PhraseChallengeHandler(phrase, keySig, "treble"), phraseFormValues:phraseFormValues, chordFormValues:chordFormValues};
    },
    resetPhrases: function(formValues){
      var rootOctave = 4
      var scaleSteps = Scale.TypeByName(formValues.scaleType)
      console.log("scalesteps", scaleSteps)
      var rootNote = formValues.key.toLowerCase() + "/" + rootOctave
      var phrase = generateScalePhrase(Scale.generate(rootNote, scaleSteps.steps, 1), 16, formValues.numnotes);
      this.setState({
        challenge: new PhraseChallengeHandler(phrase, formValues.key, formValues.clef, formValues.intervals),
        phraseFormValues:formValues
      });
    },
    resetChords: function(formValues){
      if(formValues.chordChallengeType == "random"){
        var chordsSeq = generateChordSequence(formValues.types, 6)
      }
      this.setState({challenge:new ChordChallengeHandler(chordsSeq), chordFormValues:formValues, chordChallenge:chordsSeq});
      this.refs.chordChallengeList.resetCounter()
    },
    componentWillMount: function(){
      midiutils.setupMidi([MidiPlayerCallback, this.midiCallback]);
    },
		open: function(){
			this.setState({showModal:true})
		},
		close: function(){
			this.setState({showModal:false})
		},

    resetType: function(exerciseType){
      this.setState({exerciseType:exerciseType});
      if(exerciseType == "phrase"){
        this.resetPhrases(this.state.phraseFormValues);
      }else{
        this.resetChords(this.state.chordFormValues);
      }
    },

    render: function(){
      var etype = this.state.exerciseType;
      return (
        <div>
        <Nav justified bsStyle="tabs" activeKey={etype} onSelect={this.resetType}>
          <NavItem eventKey={"phrase"}>Phrases</NavItem>
          <NavItem eventKey={"chords"}>Chords</NavItem>
        </Nav>
        {
          this.state.exerciseType == 'phrase' ?  
          <div>
            <PhraseSettingsForm changed={this.resetPhrases}/>
            <PhraseCanvas challenge={this.state.challenge} ref="phrase" enabled={this.state.exerciseType=="phrase"}/> 
          </div>
          : 
          <div>
          <ChordSettingsForm changed={this.resetChords}/>
          <ChordChallenges challenges={this.state.chordChallenge} ref="chordChallengeList" enabled={this.state.exerciseType=="chords"}/>
          </div>
        }
        </div>
      );
    }
  }
)

var ChordChallenges = React.createClass( 
  {
    getInitialState: function(){
      return {currentChallengeIndex:0};
    },
    resetCounter: function(){
      this.setState({currentChallengeIndex:0})
    },
    incChordChallenge: function(){
      this.setState({currentChallengeIndex:this.state.currentChallengeIndex+1})
    },
    render: function(){
      var cpt = this;
      return (
        <div className="container">
        <div className="row">
        {_.map(this.props.challenges, function(x, i){ return <div key={"chordChallenge_" + i} className={"pull-left chordBox" + (i==cpt.state.currentChallengeIndex?" selected":"")}>{x.name}</div>})}
        </div>
        </div>
      )
    }
  }
)

var ChordSettingsForm = React.createClass(
  {
    getInitialState: function(){
      return {chordChallengeType:"random"}
    },
    triggerFormUpdate: function(callback){
      var component = this
      var formValues = {
        types: _.pluck(_.filter(Scale.Chords, function(x){ return ReactDOM.findDOMNode(component.refs[x.name]).checked }), "name"),
        chordChallengeType: ReactDOM.findDOMNode(this.refs.chordChallengeType).value,
      }
      this.setState(formValues)
      this.props.changed(formValues)
    },
    render: function(){
      var cpt = this
      return (
        <form onUpdate={this.triggerFormUpdate}>
        <select ref="chordChallengeType" defaultValue="random">
        <option value="random">Set of random chords</option>
        <option value="progression">Chords from a progression</option>
        </select>
        { cpt.state.chordChallengeType == 'random' ? 
          <ul>
          {_.map(Scale.Chords, function(x){
            return <li key={x.name}><label><input type="checkbox" ref={x.name}/>{x.fullname}</label></li>
          })}
          </ul>
          :
          <div>
          <select ref="progression">
          <option value="a">ii-V-I</option>
          </select>
          </div>
        }
        </form>
      );
    },
  }
)

var PhraseSettingsForm = React.createClass({
  getInitialState: function(){
    return {key:"C", clef:"treble", octaves:1, scaleType:"Major"}
  }, 
  setKey: function(key){
    var state = this.state
    state.key = key
    this.props.changed(state)
    this.setState({key:key})
  },

  setClef: function(clef){
    var state = this.state
    state.clef = clef
    this.props.changed(state)
    this.setState({clef:clef})
  },

  setScaleType: function(e, scaleType){
    var state = this.state
    state.scaleType = scaleType
    this.props.changed(state)
    this.setState({scaleType:scaleType})
  },


/*
    triggerFormUpdate: function(callback){
      var component = this
      var data = {
        keySignature: ReactDOM.findDOMNode(this.refs.keySignature).value,
        clef: ReactDOM.findDOMNode(this.refs.clef).value,
        scaleType:ReactDOM.findDOMNode(this.refs.scaleType).value,
        octaves:ReactDOM.findDOMNode(this.refs.octaves).value, 
        numnotes:ReactDOM.findDOMNode(this.refs.numnotes).value,  
        //intervals:_.filter(_.keys(Scale.intervals), function(x){ return React.findDOMNode(component.refs["interval_"+x]).checked })
      };
      this.props.changed(data);
    },
    */
  render: function(){
    return (
      <span>
        <Nav bsStyle="pills" activeKey={this.state.key} className="bigger-nav settings-nav" onSelect={this.setKey}>
          {_.map(Scale.scaleMaps.cMajor, function(x){return <NavItem eventKey={x} key={x}>{x}</NavItem>})}
        </Nav>
				<Nav bsStyle="pills" activeKey={3} className="bigger-nav settings-nav" onSelect={this.setScaleType}>
					<NavDropdown eventKey="scaletype" title={"Scale: " + this.state.scaleType} id="nav-dropdown" className="no-caps">
          	{_.map(scaleTypes,  function(x){
							return <MenuItem eventKey={x.name} key={x.name}>{x.name}</MenuItem>
						})} 
					</NavDropdown>
				</Nav>
        <Nav bsStyle="pills" activeKey={this.state.clef} onSelect={this.setClef} className="bigger-nav settings-nav">
          <NavItem eventKey="treble" className="no-caps">Treble</NavItem>
          <NavItem eventKey="bass" className="no-caps">Bass</NavItem>
        </Nav>
      </span>
      /*
      <select ref="octaves" defaultValue={1}>
      {_.map(_.range(1,4), function(x){return <option value={x} key={x}>{x + " octave" + (x>1?"s":"")}</option>})}
      </select>

      <select ref="numnotes" defaultValue={1}>
      {_.map(_.range(1,5), function(x){return <option value={x} key={x}>{x + " note" + (x>1?"s":"")}</option>})}
      </select>
      </form>
      */
    );
  },
})

var PhraseCanvas = React.createClass(
  {
    render: function() {
      return (
        <div>
        <canvas ref="canv" width="800px" height="400"></canvas>
        </div>
      );
    },
    componentDidUpdate: function(){
      this.repaintCanvas();
    },
    componentDidMount: function() {
      this.repaintCanvas();
    },
    repaintCanvas: function(){
      if(!this.props.enabled){
        return
      }
      var canv = ReactDOM.findDOMNode(this.refs["canv"]);
      var renderer = new Vex.Flow.Renderer(canv, Vex.Flow.Renderer.Backends.CANVAS);
      var ctx = renderer.getContext();
      ctx.clear();
      var stave = new Vex.Flow.Stave(12, 10, 800);
      stave.addClef(this.props.challenge.clef, "default").setContext(ctx).draw();
      var vexKeySig = fixAccidental(Scale.canonicalize(this.props.challenge.key.toLowerCase()).toUpperCase())
      console.log(this.props.challenge.phrase)
      console.log("using keysignature", vexKeySig)
      stave.addKeySignature(vexKeySig);
      stave.draw();
      var staveNotes = [];
      for(var i=0;i<this.props.challenge.phrase.length;i++){
        var key = this.props.challenge.phrase[i];
        var note;
        if(typeof key == typeof ""){
          note = new Vex.Flow.StaveNote({ keys: [fixAccidental(key)], clef:this.props.challenge.clef, duration: "q"});
        }else{
          var fixedKeys = _.map(key, fixAccidental)
          note = new Vex.Flow.StaveNote({ keys: fixedKeys, clef:this.props.challenge.clef, duration: "q" });
        }
        if(i<this.props.challenge.currentIndex){
          note.setStyle({strokeStyle:"#aaa", fillStyle:"#aaa"});
        }
        staveNotes.push(note);
      }
      var voice = new Vex.Flow.Voice({ 
        num_beats: this.props.challenge.phrase.length,
        beat_value: 4,
        resolution: Vex.Flow.RESOLUTION 
      });
      voice.addTickables(staveNotes);
      Vex.Flow.Accidental.applyAccidentals([voice], fixAccidental(this.props.challenge.key));
      var formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 500);
      voice.draw(ctx, stave);
    },
  }
)

$(document).ready(function() {
  ReactDOM.render(
    <div>
    <SiteContainer/>
    </div>,
    document.getElementById('example'));
    MIDI.loadPlugin(
      { soundfontUrl: "./",
        instrument: "acoustic_grand_piano",
        onsuccess:function(x){
          console.log("Sound font loaded.")
        }
      }
    )
});

