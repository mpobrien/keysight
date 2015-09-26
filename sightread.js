
var num = 0
var MidiNote = React.createClass({
  render: function() {
    return (
      <div className="note"> 
        {this.props.note} 
      </div>
    )
  }
});

var MAX_MIDI_VALUE = 127;

var MidiState = React.createClass({
  getInitialState: function() {
    return { notes: [] };
  },
  componentDidMount: function() {
    console.log("mounted")
      var component = this
      if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({
          sysex: false // this defaults to 'false' and we won't be covering sysex in this article. 
        }).then(function(midiAccess){ // success handler
          // when we get a succesful response, run this code
          console.log('MIDI Access Object', midiAccess);
          var midi = midiAccess;

          var inputs = midi.inputs.values();
          // loop over all available inputs and listen for any MIDI input
          for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = function(message){
              var data = message.data; // this gives us our [command/channel, note, velocity] data.
              console.log('MIDI data', data); // MIDI data [144, 63, 73]
              console.log("note", getNote(data), "letter", getLetter(data), getOctave(data), getVelocity(data), midiEventType(data))
              var note = getLetter(data);
              var eventtype = midiEventType(data);
              if(eventtype=="Note On"){
                myState[note] = true;
              }else if(eventtype=="Note Off"){
                delete myState[note]
              }
              num++
              component.setState({count:num, notes:myState})
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
    console.log("my state is", this.state)
    return <div>{Object.keys(this.state.notes).join(",")}</div>
   /* var noteNodes = this.state.notes.map(function(note) {
      return (
        <div
        <MidiNote note={note.symbol}/>
      )
    })
    return ( 
      <div className = "midistate"> 
        {noteNodes} 
      </div>
    )*/
  }
});
      var myState={}
      var rootNode = <MidiState/>

     
    $(document).ready(function() {
      // request MIDI access
      React.render( <div> Hello,aaa world! {rootNode}</div>,
        document.getElementById('example')
      );
    })

    var scaleMaps = {
        'cMajor': [
          'C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F', 'F#/G♭',
          'G', 'G#/A♭', 'A', 'A#/B♭', 'B'
        ]
      }
      // midi functions
      /*
    function onMIDISuccess(midiAccess) {
      // when we get a succesful response, run this code
      console.log('MIDI Access Object', midiAccess);
      var midi = midiAccess;

      var inputs = midi.inputs.values();
      // loop over all available inputs and listen for any MIDI input
      for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = onMIDIMessage;
      }

    }

    function onMIDIFailure(e) {
      // when we get a failed response, run this code
      console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
    }
*/

    function onMIDIMessage(message) {
      var data = message.data; // this gives us our [command/channel, note, velocity] data.
      console.log('MIDI data', data); // MIDI data [144, 63, 73]
      console.log("note", getNote(data), "letter", getLetter(data), getOctave(data), getVelocity(data), midiEventType(data))
      var note = getLetter(data);
      var eventtype = midiEventType(data);
      if(eventtype=="Note On"){
        myState[note] = true;
      }else if(eventtype=="Note Off"){
        delete myState[note]
      }
      rootNode.update(myState)
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

    var tones = [{
      name: "c"
    }, {
      name: "c#"
    }, {
      name: "d"
    }, {
      name: "d#"
    }, {
      name: "e"
    }, {
      name: "f"
    }, {
      name: "f#"
    }, {
      name: "g"
    }, {
      name: "a♭"
    }, {
      name: "a"
    }, {
      name: "b♭"
    }, {
      name: "b"
    }, ]

    function majorTriad(i) {
      return [tones[i], tones[(i + 4) % 12], tones[(i + 7) % 12]]
    }

    function minorTriad(i) {
      return [tones[i], tones[(i + 3) % 12], tones[(i + 7) % 12]]
    }

    function dimTriad(i) {
      return [tones[i], tones[(i + 3) % 12], tones[(i + 6) % 12]]
    }

    function augTriad(i) {
      return [tones[i], tones[(i + 4) % 12], tones[(i + 8) % 12]]
    }

    function seventh(i) {
      return tones[(i + 10) % 12]
    }

    function majseventh(i) {
      return tones[(i + 11) % 12]
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
