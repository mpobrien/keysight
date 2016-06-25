import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import ReactDOM from 'react-dom';
import Container from './components/Container';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import { Provider } from 'react-redux';
import ThemeManager from 'material-ui/styles/ThemeManager';
import darkBaseTheme from 'material-ui/styles/baseThemes/darkBaseTheme';
import {MidiEventDebuggerDisplay, getMidiData, midiSetup} from './midihandler';
import configureStore from './stores/configureStore';
import * as actions from './actions';
import {Synth} from './synth';


const store = configureStore();
function init() {
  // Create a list of callbacks that we can push to. Each time a midi event is
  // received, we broadcast the event to all the callbacks in the list.
  let midiCallbacks = [ (x) => {store.dispatch(actions.gotMidiEvent(x))} ]

  try {
    // Fix up for prefixing
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    let soundGen = new Synth(new AudioContext());
    midiCallbacks.push((e) => {soundGen.handleMidiEvent(e)})
  }
  catch(e) {
    console.log('Web Audio API is not supported in this browser', e);
  }

  midiSetup((event) => {
    for(let cb of midiCallbacks){
      console.log("calling!", cb)
      cb(event)
    }
  })
}

window.addEventListener('load', init, false);

ReactDOM.render(
  <div>
    <Provider store={store}>
      <MidiEventDebuggerDisplay/>
    </Provider>
  </div>,
  document.getElementById('app')
);
