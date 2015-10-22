var scaleMaps = {
  'cMajor': [ 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B' ]
}

var scaleTypes = [
  { name:"Major", major:Scale.Steps.major},
  { name:"Minor", major:Scale.Steps.minor},
  { name:"Harmonic Minor", major:Scale.Steps.harmonicMinor},
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
var diffState = function(a,b){
  aKeys = Object.keys(a)
  bKeys = Object.keys(b)
  console.log("a, b", aKeys, bKeys)
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


function generateScalePhrase(scale, length){
  var out = []
  var length = length || 4
  for(var i=0;i<length;i++){
    var nextKey = _.sample(scale)
    out.push(nextKey)
  }
  return out
}

function ChordChallengeHandler(chordsSeq){
  this.chordsSeq = chordsSeq
  this.currentIndex = 0;
  this.noteState = {}
  var outer = this

  this.callback = function(message, onCorrect, onComplete){
    var data = message.data; 
    var eventtype = midiEventType(data);
    if(!getLetter(data)){
      return;
    }
    var note = getLetter(data).toLowerCase()
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
        this.state.challenge.callback(message, function(){
          cpt.refs.phrase.repaintCanvas();
        }, function(){
          cpt.reset(cpt.state.formValues)
        })
      },
      getInitialState:function(){
        var phrase = generateScalePhrase(Scale.generate("c/4", Scale.Steps.Major), 16);
        return {challenge:new PhraseChallengeHandler(phrase, "C", "treble"), formValues:{ keySignature:"C", clef:"treble", scaleType:"Major"}};
      },
      reset: function(formValues){
        var rootOctave = formValues.clef == "treble" ? "/4" : "/3";
        var scaleSteps = Scale.Steps[formValues.scaleType]
        var phrase = generateScalePhrase(Scale.generate(formValues.keySignature.toLowerCase()+rootOctave, scaleSteps), 16);
        this.setState({challenge:new PhraseChallengeHandler(phrase, formValues.keySignature, formValues.clef), formValues:formValues});
      },
      componentWillMount:function(){
        setupMidi([MidiPlayerCallback, this.midiCallback]);
      },
      render: function(){
        return (
          <div>
            <SettingsForm changed={this.reset}/>
            <PhraseCanvas challenge={this.state.challenge} ref="phrase"/>
          </div>
        );
      }
    }
)

var SettingsForm = React.createClass(
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
      var canv = React.findDOMNode(this.refs["canv"]);
      var renderer = new Vex.Flow.Renderer(canv, Vex.Flow.Renderer.Backends.CANVAS);
      var ctx = renderer.getContext();
      ctx.clear();
      var stave = new Vex.Flow.Stave(12, 10, 800);
      console.log("asfsaf", this.props.challenge.clef);
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
  React.render(
    <div>
      <SiteContainer/>
    </div>,
    document.getElementById('example'));
});

