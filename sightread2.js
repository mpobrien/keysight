var React = require("react")
var ReactDOM = require("react-dom")
var Scale = require("./scale.js")
var _ = require("underscore")
var $ = require("jquery")
var Vex = require("vexflow")
var midiutils = require("./midiutils.js")

//var scaleMaps = {
  //'cMajor': [ 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B' ]
//}

var scaleTypes = [
  { name:"Major", major:Scale.Steps.major},
  { name:"Minor", major:Scale.Steps.minor},
  { name:"Harmonic Minor", major:Scale.Steps.harmonicMinor},
  { name:"Blues", major:Scale.Steps.Blues},
]

function fixAccidental(x){
	x = x.replace(/#/g, "♯")
	x = x.replace(/b/g, "♭")
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
	typesAllowed = ["major"]
  }
  var challenges = []
  for(var i=0;i<n;i++){
    // get a random chord form the set of allowed chord types
	var chordTypeName = _.sample(typesAllowed)
	var chordObj = Scale.chordTypeByName(chordTypeName)

	var rootNote = _.sample(Scale.scaleMaps.cMajor)

	console.log(chordObj)
	var ns = _.map(chordObj.gen(_.indexOf(Scale.scaleMaps.cMajor, rootNote)), function(x){return x.toLowerCase()}) 
	challenges.push({name: rootNote + chordObj.name, notes: ns})
  }
  console.log("challenges is", challenges)
  return challenges
}

function generateScalePhrase(scale, length, numNotes){//allowedIntervals){
  var out = []
  var length = length || 4
  if(!numNotes){
    numNotes = 1
  }
  //if (!allowedIntervals){
	//allowedIntervals = []
  //}
  for(var i=0;i<length;i++){
    var nextKeySet = []
    while(nextKeySet.length < numNotes){
        var filteredScale = _.filter(scale, function(x){return !_.contains(nextKeySet, x)})
        nextKeySet.push(_.sample(filteredScale))
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
		  outer.correctState = objectifyChordNotes(chordsSeq[outer.currentIndex].notes)
	  }
    }else{
      console.log("incorrect!");
    }
  }
}

function PhraseChallengeHandler(phrase, keySignature, clef, intervals){
  this.phrase = phrase
  this.currentIndex = 0;
  this.keySignature = keySignature
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
        var phrase = generateScalePhrase(Scale.generate("c/4", Scale.Steps.Major, 1), 16);
        var phraseFormValues =  { keySignature:"C", clef:"treble", scaleType:"Major", octaves:1, intervals:[]}
        var chordFormValues = {types:[""], chordChallengeType:"random"}
        return {exerciseType:"phrase", challenge:new PhraseChallengeHandler(phrase, "C", "treble"), phraseFormValues:phraseFormValues, chordFormValues:chordFormValues};
      },
      resetPhrases: function(formValues){
        var octaves = parseInt(formValues.octaves)
        var rootOctave = (5 - (octaves) +parseInt(.5 * octaves) )
        if(formValues.clef != "treble"){
          rootOctave -= 2
        }
        var scaleSteps = Scale.Steps[formValues.scaleType]
        var rootNote = formValues.keySignature.toLowerCase() + "/" + rootOctave
        /*
         * for using intervals instead of # notes within scale.
		var ints = [];
		for(var i=0;i<formValues.intervals.length;i++){
			ints.push(Scale.intervals[formValues.intervals[i]])
		}
        var phrase = generateScalePhrase(Scale.generate(rootNote, scaleSteps, octaves), 16, ints);
        */
        var phrase = generateScalePhrase(Scale.generate(rootNote, scaleSteps, octaves), 16, formValues.numnotes);
        this.setState({challenge:new PhraseChallengeHandler(phrase, formValues.keySignature, formValues.clef, formValues.intervals), phraseFormValues:formValues});
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
      resetType: function(){
        var exerciseType = ReactDOM.findDOMNode(this.refs.challengeType).value
          this.setState({exerciseType:exerciseType})
          if(exerciseType == "phrase"){
            this.resetPhrases(this.state.phraseFormValues)
          }else{
            this.resetChords(this.state.chordFormValues)
          }
      },
      render: function(){
        return (
          <div>
              <select onUpdate={this.resetType} ref="challengeType">
                    <option value="phrase">Phrase</option>
                    <option value="chords">Chords</option>
              </select>
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
            {_.map(this.props.challenges, function(x, i){ return <div key={"chordChallenge_" + i} className={"pull-left chordBox" + (i==cpt.state.currentChallengeIndex?" selected":"")}>{fixAccidental(x.name)}</div>})}
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
        types: _.pluck(_.filter(Scale.Chords, function(x){ return React.findDOMNode(component.refs[x.name]).checked }), "name"),
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
              return <li><label><input type="checkbox" ref={x.name}/>{x.fullname}</label></li>
              })}
            </ul>
            :
            <div>
              <select ref="keySignature">
                {_.map(Scale.scaleMaps.cMajor, function(x){return <option value={x} key={x}>{x}</option>})}
              </select>
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

var PhraseSettingsForm = React.createClass(
  {
    triggerFormUpdate: function(callback){
      var component = this
      var data = {
        keySignature: ReactDOM.findDOMNode(this.refs.keySignature).value,
        clef: React.findDOMNode(this.refs.clef).value,
        scaleType:React.findDOMNode(this.refs.scaleType).value,
        octaves:React.findDOMNode(this.refs.octaves).value, 
        numnotes:React.findDOMNode(this.refs.numnotes).value,  
        //intervals:_.filter(_.keys(Scale.intervals), function(x){ return React.findDOMNode(component.refs["interval_"+x]).checked })
      };
      console.log(data)
      this.props.changed(data);
    },
    render: function(){
      return (
        <form onUpdate={this.triggerFormUpdate}>
          <select ref="keySignature">
            {_.map(Scale.scaleMaps.cMajor, function(x){return <option value={x} key={x}>{x}</option>})}
          </select>
          <select ref="scaleType">
            {_.map(scaleTypes,  function(x){return <option value={x.name} key={x.name}>{x.name}</option>})} 
          </select>
          <select ref="clef">
            <option value="treble">treble</option>
            <option value="bass">bass</option>
          </select>
          <select ref="octaves" defaultValue={1}>
            {_.map(_.range(1,4), function(x){return <option value={x} key={x}>{x + " octave" + (x>1?"s":"")}</option>})}
          </select>

          <select ref="numnotes" defaultValue={1}>
            {_.map(_.range(1,5), function(x){return <option value={x} key={x}>{x + " note" + (x>1?"s":"")}</option>})}
          </select>
        </form>
      );
    },

  /*
  <ul>
    {_.map(_.keys(Scale.intervals), function(k){
      return <li><label>{k}<input type="checkbox" value={k} ref={"interval_"+k}/></label></li>
    })}
  </ul>
  */
  }
)

var PhraseCanvas = React.createClass(
  {
    render: function() {
      return (
        <div>
          <canvas ref="canv" width="600" height="400"></canvas>
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
      stave.addKeySignature(this.props.challenge.keySignature);
      stave.draw();
      var staveNotes = [];
      for(var i=0;i<this.props.challenge.phrase.length;i++){
        var key = this.props.challenge.phrase[i];
        var note;
        if(typeof key == typeof ""){
          note = new Vex.Flow.StaveNote({ keys: [key], clef:this.props.challenge.clef, duration: "q"});
        }else{
          note =new Vex.Flow.StaveNote({ keys: key, clef:this.props.challenge.clef, duration: "q" });
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
      Vex.Flow.Accidental.applyAccidentals([voice], this.props.challenge.keySignature);
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
          console.log("success", x)
        }
      }
    )
});

