var num = 0

function PhraseChallengeHandler(phrase, keySignature, clef){
  this.phrase = phrase
  this.currentIndex = 0;
  this.noteState = {}
  this.keySignature = keySignature
  this.clef = clef
  var outer = this

  this.getHandler = function(callback){
    return function(message){
      var data = message.data; 
      var eventtype = midiEventType(data);
      console.log(eventtype)
        console.log(data, getLetter(data))
        if(!getLetter(data)){
          return
        }
      var note = getLetter(data).toLowerCase() + "/" + parseInt(getOctave(data)-1);
      if(eventtype=="Note On"){
        outer.noteState[note] = true;
        var correctState = {}
        if(typeof outer.phrase[outer.currentIndex] == typeof ""){
          correctState[outer.phrase[outer.currentIndex]] = true
        }else{
          if(outer.currentIndex>=0 && outer.currentIndex < outer.phrase.length){
            outer.phrase[outer.currentIndex].forEach(function(x){
              correctState[x] = true
            })
          }
        }
        if(diffState(correctState, outer.noteState)){
          console.log("correct!")
            outer.currentIndex+=1
            if(callback){
              callback()
            }
        }else{
          console.log("incorrect!")
        }
      } else if(eventtype=="Note Off") {
        delete outer.noteState[note]
      }
    }
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

var MidiPlayerCallback = function(message){
  var data = message.data; 
  var eventtype = midiEventType(data);
  if(eventtype=="Note On"){
    MIDI.noteOn(0, data[1], 100, 0);
  }else if(eventtype=="Note Off"){
    MIDI.noteOff(0, data[1]);
  }
}

var ChallengeSettings = React.createClass({
  getInitialState: function(){
    var keySignature = "C"
    var clef = "treble"
    var challenge = generateScaleChallenge(Scale.generate(keySignature.toLowerCase()+"/4", Scale.Steps.major), 16)
    var pch = new PhraseChallengeHandler(challenge)
    var phrase = <Phrase clef={clef} keySignature={keySignature} challenge={pch} ref="phrase"/>
    console.log("HEY", phrase, "Asf", phrase.setState)
    return {keySignature:keySignature, clef:clef, challengeHandler:pch, phrase:phrase}
  },
  componentDidMount: function(){
    var cpt = this
    setupMidi([MidiPlayerCallback, this.state.challengeHandler.getHandler(function(){ 
      var p = cpt.refs.phrase;
      p.repaintCanvas()
      //console.log(p, p.repaintCanvas())

    }) ])
  },
  onChange: function(){
    var keySignature = React.findDOMNode(this.refs["keySignature"]).value
    var clef = React.findDOMNode(this.refs["clef"]).value
    var challenge = generateScaleChallenge(Scale.generate(keySignature.toLowerCase()+"/4", Scale.Steps.major), 16)
    var pch = new PhraseChallengeHandler(challenge)
    var phrase = <Phrase clef={clef} keySignature={keySignature} challenge={pch} ref="phrase"/>
    this.setState({keySignature:keySignature, clef:clef, challengeHandler:pch, phrase:phrase})
  },
  render: function(){
    return (
      <div>
        <label>Key:&nbsp;
        <select ref="clef" onChange={this.onChange}>
          <option value="treble">Treble Only</option>
          <option value="bass">Bass Only</option>
          <option value="tb">Treble and Bass</option>
        </select>
        <select ref="keySignature" onChange={this.onChange}>
          {_.map(scaleMaps.cMajor, function(x){return <option value={x} key={x}>{x}</option>})}
        </select>
        </label>
        <div>
          {this.state.phrase}
        </div>
      </div>
    )
  }
})

var Phrase = React.createClass({
  render: function() {
    return (
      <div>
        <canvas ref="canv" width="600" height="400"></canvas>
      </div>
    )
  },
  repaintCanvas: function(){
    var canv = React.findDOMNode(this.refs["canv"])
    var renderer = new Vex.Flow.Renderer(canv, Vex.Flow.Renderer.Backends.CANVAS);
    var ctx = renderer.getContext();
    ctx.clear()
    var stave = new Vex.Flow.Stave(12, 10, 800);
    stave.addClef(this.props.clef, "default").setContext(ctx).draw();
    stave.addKeySignature(this.props.keySignature)
    stave.draw()
    var staveNotes = []
    for(var i=0;i<this.props.challenge.phrase.length;i++){
      var key = this.props.challenge.phrase[i];
      var note;
      if(typeof key == typeof ""){
        note = new Vex.Flow.StaveNote({ keys: [key], clef:this.props.clef, duration: "q"})
      }else{
        note =new Vex.Flow.StaveNote({ keys: key, clef:this.props.clef, duration: "q" })
      }
      if(i<this.props.challenge.currentIndex){
        note.setStyle({strokeStyle:"#aaa", fillStyle:"#aaa"})
      }
      staveNotes.push(note);
    }
    voice = new Vex.Flow.Voice({ 
      num_beats: this.props.challenge.phrase.length,
      beat_value: 4,
      resolution: Vex.Flow.RESOLUTION 
    });
    voice.addTickables(staveNotes);
    Vex.Flow.Accidental.applyAccidentals([voice], this.props.keySignature || "C");
    var formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 500);
    voice.draw(ctx, stave);
  },
  componentDidUpdate: function(){
    this.repaintCanvas()
  },
  componentDidMount: function() {
    this.repaintCanvas()
  },
})

function generateScaleChallenge(scale, length){
  var out = []
  var length = length || 4
  for(var i=0;i<length;i++){
    var nextKey = _.sample(scale)
    out.push(nextKey)
  }
  return out
}

var MAX_MIDI_VALUE = 127;

var scaleMaps = {
  'cMajor': [ 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B' ]
}

var tones = scaleMaps.cMajor

function regenerateChallenges(typesAllowed){
  var challenges = []
  for(var i=0;i<10;i++){
    var chordtypeIndex = _.random(0, typesAllowed.length-1)
    var chordtype = typesAllowed[chordtypeIndex]
    var rootIndex = _.random(0, tones.length-1)
    challenges.push({name : tones[rootIndex] + chordtype.name, notes:chordtype.gen(rootIndex)})
  }
  return challenges
}

function getVelocity(data) {
  if (data[0] >= 128 && data[0] <= 159) {
    return data[2] / MAX_MIDI_VALUE;
  }
}

function getNote(data) {
  if (data[0] >= 128 && data[0] <= 159) {
    return data[1];
  }
}

function getLetter(data, scale) {
  var scaleMap = scaleMaps.cMajor;
  scaleMap = scaleMaps[scale] || scaleMap;
  if (data[0] >= 128 && data[0] <= 159) {
    return scaleMap[data[1] % 12];
  }
}

function getOctave(data, scale) {
  var scaleMap = scaleMaps.cMajor;
  scaleMap = scaleMaps[scale] || scaleMap;
  if (data[0] >= 128 && data[0] <= 159) {
    return Math.floor(data[1] / 12);
  }
}

function midiEventType (data) {
  if (data[0] >= 128 && data[0] <= 143) {
    return 'Note Off';
  }
  if (data[0] >= 144 && data[0] <= 159) {
    return 'Note On';
  }
  if (data[0] === 185) {
    if (data[1] === 11) {
      return 'Expression';
    }
    if (data[1] === 64) {
      return 'Sustain';
    }
  }
  if (data[0] === 185 && data[1] === 11) {
    return 'Expression';
  }
}

function checkChallenge(input, chord){
  var chordFound = {}
  for(var i=0;i<input.length;i++){
    if(!(_.contains(chord, noteOnly(input[i])))){
      return false
    }
    chordFound[noteOnly(input[i])] = true
  }
  return Object.keys(chordFound).length == chord.length
}


function setupMidi(callbacks){
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({sysex:false}).then(function(midiAccess){ 
      var midi = midiAccess;
      var inputs = midi.inputs.values();
      for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = function(message){
          for(var i=0;i<callbacks.length;i++){
            callbacks[i](message)
          }
        }
      }
    }, function(){
      throw Exception("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim:"+e);
    });
  } else {
    throw Exception("No MIDI support in your browser.");
  }
}

var myState = {}

$(document).ready(function() {
  React.render(
    <div>
      <ChallengeSettings/>
    </div>,
    document.getElementById('example'));
})

//iim7 V7 Imaj7
//Imaj7 vim7 iim7 VI 7
