
if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess({ sysex: false }).then(function(midiAccess){ 
    var midi = midiAccess;
    var inputs = midi.inputs.values();
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
      input.value.onmidimessage = function(message){
        MidiPlayerHandler(message)
      }
    }
    refreshCanvas(component.state.notes, component.state.ctx, component.state.stave)
  }, function(){
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
  });
} else {
  alert("No MIDI support in your browser.");
}
