import { connect } from 'react-redux'
import React from 'react';
export const EVENT_NOTEOFF = "Note Off";
export const EVENT_NOTEON = "Note On";
export const EVENT_SUSTAIN = "Sustain";
export const EVENT_Expr = "Expression";

export function midiSetup(callback) {
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({sysex:false}).then(function(midiAccess){ 
      let midi = midiAccess;
      let inputs = midi.inputs.values();
      for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = (message) => callback(message)
      }
    }, function(){
      throw Exception("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim:"+e);
    });
  } else {
    throw Exception("No MIDI support in your browser.");
  }
}

export function getMidiData(data){
  let scaleMap = [ 'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B' ]
  let retVal = {}

  if (data[0] >= 128 && data[0] <= 159) {
    retVal.velocity = data[2];
    retVal.note = data[1];
    retVal.letter = scaleMap[data[1] % 12];
    retVal.octave = Math.floor(data[1] / 12);
  }

  if (data[0] >= 128 && data[0] <= 143) {
    retVal.event = EVENT_NOTEOFF;
  }
  if (data[0] >= 144 && data[0] <= 159) {
    retVal.event = EVENT_NOTEON;
  }
  if (data[0] === 185) {
    if (data[1] === 11) {
      retVal.event = EVENT_EXPR;
    }
    if (data[1] === 64) {
      retVal.event = EVENT_SUSTAIN;
    }
  }
  if (data[0] === 185 && data[1] === 11) {
    retVal.event = EVENT_EXPR;
  }
  return retVal;
}

let midiStateDisplay = function({midi = {}}){
  return (
    <div>hi {midi.notes}</div>
  )
}

function mapStateToProps(state) {
  const midi = state.midi;
  return {
    midi
  }
}


const MidiEventDebuggerDisplay = connect(mapStateToProps)(midiStateDisplay)

export {MidiEventDebuggerDisplay}

