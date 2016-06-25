import * as actionTypes from '../constants/actionTypes';

export function gotMidiEvent(midiEvent) {
  return {
    type: actionTypes.MIDI_EVENT,
    midiEvent
  };
};

