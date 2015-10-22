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

