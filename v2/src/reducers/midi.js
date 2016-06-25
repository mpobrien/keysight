import * as actionTypes from '../constants/actionTypes';
import * as midihandler from '../midihandler'

const initialState = {notes:new Set()};

export default function(state = initialState, action) {
  switch (action.type) {
    case actionTypes.MIDI_EVENT:
      return updateMidiState(state, action);
  }
  return state;
}

function updateMidiState(state, action) {
  let noteSet = new Set(state.notes.values())
  let parsedMidi = midihandler.getMidiData(action.midiEvent.data)
  let noteKey = `${parsedMidi.letter}${parsedMidi.octave}`
  if(parsedMidi.event == midihandler.EVENT_NOTEOFF){
    noteSet.delete(noteKey)
  }else if (parsedMidi.event == midihandler.EVENT_NOTEON){
    noteSet.add(noteKey)
  }
  return {notes:noteSet};
}

