
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
  gen:  function(i) {
    return [tones[i], tones[(i + 4) % 12], tones[(i + 7) % 12]]
  }
}

var minor= {
  name: "m",
  gen: function(i) {
    return [tones[i], tones[(i + 3) % 12], tones[(i + 7) % 12]]
  }
}

var dim= {
  name: "dim",
  gen: function(i) {
    return [tones[i], tones[(i + 3) % 12], tones[(i + 6) % 12]]
  }
}

var aug= {
  name: "aug",
  gen: function(i) {
    return [tones[i], tones[(i + 4) % 12], tones[(i + 8) % 12]]
  }
}

var seventh = {
  name: "7",
  gen: function(i){
    return major.gen(i).concat(tones[(i + 10) % 12])
  }
}


var maj7 = {
  name:"maj7",
  gen: function(i){
    return major.gen(i).concat(tones[(i + 11) % 12])
  }
}

var min7 = {
  name:"m7",
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
    if(!(_.contains(chord, input[i]))){
      return false
    }
    chordFound[input[i]] = true
  }
  console.log("checked", Object.keys(chordFound), chord)
  return Object.keys(chordFound).length == chord.length
}

var refreshCanvas = function(notes, ctx, stave){
  var tickables = []
  var voices = []
  var keys = []
  for(var noteKey in notes){
    var key = noteKey.toLowerCase()+"/4"
    keys.push(key)
  }
  var staveNote = new Vex.Flow.StaveNote({ keys: keys, duration: "w" })
  var i = 0; 
  for(var noteKey in notes){
    if(noteKey.length>1){
      staveNote.addAccidental(i, new Vex.Flow.Accidental(noteKey[1]))
    }
    i++
    var key = noteKey.toLowerCase()+"/4"
    keys.push(key)
  }

  var voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4, resolution: Vex.Flow.RESOLUTION });
  voice.addTickables([staveNote]);
  ctx.clear()
  stave.draw()
  //if(voices.length==0) return
  var formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 500);
  voice.draw(ctx, stave);
}

var MidiState = React.createClass({
  getInitialState: function() {
    var canvas = $("canvas")[0];
    var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
    var ctx = renderer.getContext();
    var challenges = []
    for(var i=0;i<10;i++){
      var chordtypeIndex = _.random(0, chordTypes.length-1)
      var chordtype = chordTypes[chordtypeIndex]
      var rootIndex = _.random(0, tones.length-1)
      challenges.push({name : tones[rootIndex] + chordtype.name, notes:chordtype.gen(rootIndex)})
    }
    return {notes: [], ctx: ctx, challenges:challenges, currentChallenge:0};
  },
  componentDidMount: function() {
      var stave = new Vex.Flow.Stave(10, 0, 500);
      stave.addClef("treble").setContext(this.state.ctx).draw();
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
              var note = getLetter(data);
              var eventtype = midiEventType(data);
              if(eventtype=="Note On"){
                MIDI.noteOn(0, data[1], 100, 0);
                myState[note] = true;
                console.log(component.state.currentChallenge, component.state.challenges)
                var result = checkChallenge(Object.keys(myState), component.state.challenges[component.state.currentChallenge].notes);
                if(result){
                  component.setState({currentChallenge:component.state.currentChallenge+1})
                }
              }else if(eventtype=="Note Off"){
                delete myState[note]
                MIDI.noteOff(0, data[1]);
              }
              component.setState({notes:myState, ctx:vexCtx, stave:stave})
              refreshCanvas(component.state.notes, component.state.ctx, component.state.stave)
            }
          }
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
  render: function() {
    //console.log("my state is", this.state.notes)
    /*for(var noteKey in this.state.notes){
      var notes = [ new Vex.Flow.StaveNote({ keys: [noteKey.toLowerCase()+"/4"], duration: "w" }), ];
      var voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4, resolution: Vex.Flow.RESOLUTION });
      voice.addTickables(notes);
      var formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 500);
      //console.log("drawing", this.state.ctx)
      this.state.ctx.clear()
      voice.draw(this.state.ctx, this.state.stave);
    }
    */
    var challengeElems = []
    for(var i=0;i<this.state.challenges.length;i++){
      //console.log(this.state.challenges[i])
      challengeElems.push(<Challenge current={this.state.currentChallenge==i} challenge={this.state.challenges[i]}/>)
    }
    return (
      <div>
        <ul>
          {challengeElems}
        </ul>
        <div>{Object.keys(this.state.notes).join(",")}</div>
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

