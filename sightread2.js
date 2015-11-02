var scaleMaps = {
  'cMajor': [ 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B' ]
}

var scaleTypes = [
  { name:"Major", major:Scale.Steps.major},
  { name:"Minor", major:Scale.Steps.minor},
  { name:"Harmonic Minor", major:Scale.Steps.harmonicMinor},
  { name:"Blues", major:Scale.Steps.Blues},
]

var MidiPlayerCallback = function(message){
  var data = message.data; 
  var eventtype = midiEventType(data);
  if(eventtype=="Note On"){
    MIDI.noteOn(0, data[1], 100, 0);
  }else if(eventtype=="Note Off"){
    MIDI.noteOff(0, data[1]);
  }
}
var diffState = function(a,b, anyVoicing){
  aKeys = Object.keys(a)
  bKeys = Object.keys(b)
  console.log("a, b", aKeys, bKeys)
  if(anyVoicing){
	aKeys = _.map(aKeys, noteOnly)
	bKeys = _.map(bKeys, noteOnly)
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
	return []
  }
  var challenges = []
  for(var i=0;i<n;i++){
    // get a random chord form the set of allowed chord types
	var chordTypeName = _.sample(typesAllowed)
	var chordObj = Scale.chordTypeByName(chordTypeName)

	var rootNote = _.sample(scaleMaps.cMajor)

	console.log(chordObj)
	var ns = _.map(chordObj.gen(_.indexOf(scaleMaps.cMajor, rootNote)), function(x){return x.toLowerCase()}) 
	challenges.push({name: rootNote + chordObj.name, notes: ns})
  }
  console.log("challenges is", challenges)
  return challenges
}

function generateScalePhrase(scale, length){
  var out = []
  var length = length || 4
  for(var i=0;i<length;i++){
    var nextKey = _.sample(scale)
    out.push(nextKey)
  }
  return out
}

objectifyChordNotes = function(ns){
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
    var eventtype = midiEventType(data);
	console.log("expected", outer.correctState.notes)
	console.log("actual", outer.noteState)
    if(!getLetter(data)){
      return;
    }
    var note = getLetter(data).toLowerCase() + "/" + parseInt(getOctave(data)-1);
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

function PhraseChallengeHandler(phrase, keySignature, clef){
  this.phrase = phrase
  this.currentIndex = 0;
  this.keySignature = keySignature
  this.clef = clef
  this.noteState = {}
  var outer = this

  this.callback = function(message, onCorrect, onComplete){
    var data = message.data; 
    var eventtype = midiEventType(data);
    if(!getLetter(data)){
      return;
    }
    var note = getLetter(data).toLowerCase() + "/" + parseInt(getOctave(data)-1);
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
			  cpt.resetPhrase(cpt.state.formValues)
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
        var phrase = generateScalePhrase(Scale.generate("c/4", Scale.Steps.Major), 16);
		var phraseFormValues =  { keySignature:"C", clef:"treble", scaleType:"Major"}
		var chordFormValues = {types:[""]}
        return {exerciseType:"phrase", challenge:new PhraseChallengeHandler(phrase, "C", "treble"), phraseFormValues:phraseFormValues, chordFormValues:chordFormValues};
      },
      resetPhrases: function(formValues){
        var rootOctave = formValues.clef == "treble" ? "/4" : "/3";
        var scaleSteps = Scale.Steps[formValues.scaleType]
        var phrase = generateScalePhrase(Scale.generate(formValues.keySignature.toLowerCase() + rootOctave, scaleSteps), 16);
        this.setState({challenge:new PhraseChallengeHandler(phrase, formValues.keySignature, formValues.clef), phraseFormValues:formValues});
      },
	  resetChords: function(formValues){
		var chordsSeq = generateChordSequence(formValues.types, 6)
        this.setState({challenge:new ChordChallengeHandler(chordsSeq), chordFormValues:formValues, chordChallenge:chordsSeq});
	  },
      componentWillMount:function(){
        setupMidi([MidiPlayerCallback, this.midiCallback]);
      },
	  resetType: function(){
        exerciseType = React.findDOMNode(this.refs.challengeType).value
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
			<select onChange={this.resetType} ref="challengeType">
				<option value="phrase">Phrase</option>
				<option value="chords">Chords</option>
			</select>
            <PhraseSettingsForm changed={this.resetPhrases}/>
            {
				this.state.exerciseType == 'phrase' 
				   ?  
					<PhraseCanvas challenge={this.state.challenge} ref="phrase" enabled={this.state.exerciseType=="phrase"}/> 
				   : <div>
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
	getInitialState:function(){
		return {currentChallengeIndex:0}
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
    triggerFormUpdate: function(callback){
	  var component = this
	  formValues = {
		types:_.pluck(_.filter(Scale.Chords, function(x){ return React.findDOMNode(component.refs[x.name]).checked }), "name")
	  }
	  this.props.changed(formValues)
    },
    render: function(){
      return (
        <form onChange={this.triggerFormUpdate}>
			<ul>
			{_.map(Scale.Chords, function(x){
				return <li><label>{x.fullname}<input ref={x.name} type="checkbox"/></label></li>
			})}
			</ul>
        </form>
      );
    },
  }
)

var PhraseSettingsForm = React.createClass(
  {
    triggerFormUpdate: function(callback){
      var data = {
        keySignature: React.findDOMNode(this.refs.keySignature).value,
        clef: React.findDOMNode(this.refs.clef).value,
        scaleType:React.findDOMNode(this.refs.scaleType).value,
      };
      this.props.changed(data);
    },
    render: function(){
      return (
        <form onChange={this.triggerFormUpdate}>
          <select ref="keySignature">
            {_.map(scaleMaps.cMajor, function(x){return <option value={x} key={x}>{x}</option>})}
          </select>
          <select ref="scaleType">
            {_.map(scaleTypes,  function(x){return <option value={x.name} key={x.name}>{x.name}</option>})} 
          </select>
          <select ref="clef">
            <option value="treble">treble</option>
            <option value="bass">bass</option>
          </select>
        </form>
      );
    },
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
	  console.log("repainting!")
      var canv = React.findDOMNode(this.refs["canv"]);
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
      voice = new Vex.Flow.Voice({ 
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
});

