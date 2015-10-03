
var num = 0
var Challenge = React.createClass({
  render: function() {
    var challengeClass = this.props.current ? "current" : "";
    return (
      <li className={challengeClass}> 
        {this.props.challenge["name"]} 
      </li>
    )
  }
});

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

var major= {
  name: "",
  fullname: "major",
  gen:  function(i) {
    return [tones[i], tones[(i + 4) % 12], tones[(i + 7) % 12]]
  }
}

var minor= {
  name: "m",
  fullname: "minor",
  gen: function(i) {
    return [tones[i], tones[(i + 3) % 12], tones[(i + 7) % 12]]
  }
}

var dim= {
  name: "dim",
  fullname: "diminished",
  gen: function(i) {
    return [tones[i], tones[(i + 3) % 12], tones[(i + 6) % 12]]
  }
}

var aug= {
  name: "aug",
  fullname: "augmented",
  gen: function(i) {
    return [tones[i], tones[(i + 4) % 12], tones[(i + 8) % 12]]
  }
}

var seventh = {
  name: "7",
  fullname: "seventh",
  gen: function(i){
    return major.gen(i).concat(tones[(i + 10) % 12])
  }
}


var maj7 = {
  name:"maj7",
  fullname: "major7th",
  gen: function(i){
    return major.gen(i).concat(tones[(i + 11) % 12])
  }
}

var min7 = {
  name:"m7",
  fullname: "minor7th",
  gen: function(i){
    return minor.gen(i).concat(tones[(i + 10) % 12])
  }
}

var chordTypes = [major, minor, maj7, min7, seventh]//, dim, aug]

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

var refreshCanvas = function(notes, ctx, stave){
  var keys = []
  var voice
  var notecount = 0
  for(var noteKey in notes){
    notecount++
      var key = noteKey.toLowerCase()//noteOnly(noteKey)[0].toLowerCase()+"/"+octaveOnly(noteKey)
      keys.push(key)
  }
  if(notecount > 0){
    var staveNote = new Vex.Flow.StaveNote({ keys: keys, duration: "w" });
    voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4, resolution: Vex.Flow.RESOLUTION });
    voice.addTickables([staveNote]);
    Vex.Flow.Accidental.applyAccidentals([voice], "C");
    var formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 500);
  }
  ctx.clear()
  stave.draw()
  if(notecount>0)
    voice.draw(ctx, stave);
}

function noteOnly(noteName){
  return noteName.split("/")[0]
}

function octaveOnly(noteName){
  return noteName.split("/")[1]
}
function accidental(noteName){
    var accidental = noteName.indexOf("#")
    accidental = accidental < 0 ? noteName.indexOf("b") : accidental
    if(accidental>=0){
      return noteName[accidental]
    }
}

var MidiState = React.createClass({
  getInitialState: function() {
    var canvas = $("canvas")[0];
    var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
    var ctx = renderer.getContext();
    this.props.settings = {"major":false, "minor":true,"seventh":true, "m7":true, "maj7":true}
    return {
      notes: [],
      ctx: ctx,
      currentChallenge:0, 
      challenges:regenerateChallenges(chordTypes),
      events:[],
      selectedTypes:chordTypes};
  },
  componentDidMount: function() {
      var stave = new Vex.Flow.Stave(12, 10, 800);
      stave.addClef("treble", "default").setContext(this.state.ctx).draw();
      stave.addKeySignature("C")
      var component = this
      component.setState({notes:myState, ctx:this.state.ctx, stave:stave})
      var vexCtx = this.state.ctx
      if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({
          sysex: false // this defaults to 'false' and we won't be covering sysex in this article. 
        }).then(function(midiAccess){ // success handler
          // when we get a succesful response, run this code
          var midi = midiAccess;

          var inputs = midi.inputs.values();
          console.log(inputs)
          // loop over all available inputs and listen for any MIDI input
          for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = function(message){
              var data = message.data; // this gives us our [command/channel, note, velocity] data.
              var note = getLetter(data) + "/" + getOctave(data);
              var eventtype = midiEventType(data);
              if(eventtype=="Note On"){
                MIDI.noteOn(0, data[1], 100, 0);
                myState[note] = true;
                console.log(component.state.currentChallenge, component.state.challenges)
                var result = checkChallenge(Object.keys(myState), component.state.challenges[component.state.currentChallenge].notes);
                if(result){
                  component.setState( {currentChallenge:component.state.currentChallenge+1})
                }
              }else if(eventtype=="Note Off"){
                delete myState[note]
                MIDI.noteOff(0, data[1]);
              }
              component.setState({notes:myState, ctx:vexCtx, stave:stave, events: component.state.events.concat(message)})
              refreshCanvas(component.state.notes, component.state.ctx, component.state.stave)
            }
          }
          refreshCanvas(component.state.notes, component.state.ctx, component.state.stave)
        }, function(){
          console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
        });
      } else {
        alert("No MIDI support in your browser.");
      }
  },

  update:function(s){
    this.setState(s)
  },


  handleUserInput: function(filterText, inStockOnly) {
    this.setState({
      filterText: filterText,
      inStockOnly: inStockOnly
    });
  },

  render: function() {
    var challengeElems = []
    for(var i=0;i<this.state.challenges.length;i++){
      challengeElems.push(<Challenge current={this.state.currentChallenge==i} challenge={this.state.challenges[i]}/>)
    }
    var inputs = []
    for(var i=0;i<chordTypes.length;i++){
      inputs.push(
        <div><label><input ref={chordTypes[i].fullname} type="checkbox"/>{chordTypes[i].fullname}</label></div>
      )
    }
    var reset = function(component){
      return function(){
        var selectedChordTypes = []
        console.log("node", component.refs, React.findDOMNode(component.refs.major))
        for(var i=0;i<chordTypes.length;i++){
          var x = React.findDOMNode(component.refs[chordTypes[i].fullname])
          if(x.checked){
            selectedChordTypes.push(chordTypes[i])
          }
        }
        component.setState({challenges:regenerateChallenges(selectedChordTypes), currentChallenge:0, selectedTypes:selectedChordTypes})
      }
    }(this)

    var eventDebug = []
    for(var i=0;i<this.state.events.length;i++){
      eventDebug.push(<li>note: {getNote(this.state.events[i].data)} octave: {getOctave(this.state.events[i].data)}</li>)
    }

    var events
    return (
      <div>
        <ul>
          {challengeElems}
        </ul>
        <div>{Object.keys(this.state.notes).join(",")}</div>
        {inputs}
        <button onClick={reset}>Reset</button>
        <ul>{eventDebug}</ul>
      </div>
    )
  }
});

var myState={}
var rootNode = <MidiState/>

   
$(document).ready(function() {
  // request MIDI access
  React.render( <div>{rootNode}</div>, document.getElementById('example'));
})

//iim7 V7 Imaj7
//Imaj7 vim7 iim7 VI 7

