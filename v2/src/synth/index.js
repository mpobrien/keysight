import * as midihandler from '../midihandler'

let noteNumToFreq = (note) => 440 * Math.pow(2,(note-69)/12);

const waveforms = ["sine","square","sawtooth","triangle"];

// TODO: make these non-constants!
const PORTAMENTO = 0.05;
const ATTACK = 0.05;   
const RELEASE = 0.05;  
const PITCHWHEEL = 0.0;

class Synth {
  constructor(context){
    this.context = context;
    this.activeNotes = {};
  }

  noteOn(noteNum){
    let voice = new Voice(this.context, noteNum)
    voice.on()
    this.activeNotes[noteNum] = voice
  }

  noteOff(noteNum){
    let voice = this.activeNotes[noteNum]
    if(voice){
      voice.off()
    }
  }

  handleMidiEvent(event){
    console.log("synth handling midi event!", event)
    let parsedMidi = midihandler.getMidiData(event.data)
    if(parsedMidi.event == midihandler.EVENT_NOTEOFF){
      this.noteOff(parsedMidi.note)
    }else if (parsedMidi.event == midihandler.EVENT_NOTEON){
      this.noteOn(parsedMidi.note)
    }else{
    console.log("doing whatever ", parsedMidi.event)
    }
  }
}



class Voice{
  constructor(context, note){
    this.note = note
    let baseFreq = noteNumToFreq(note)
    // set up the basic oscillator chain, muted to begin with.
    this.oscillator = context.createOscillator();
    this.oscillator.frequency.setValueAtTime(baseFreq, 0);
    this.envelope = context.createGain();
    this.oscillator.connect(this.envelope);
    this.envelope.connect(context.destination);
    this.envelope.gain.value = 0.0;  // Mute the sound
    this.oscillator.start(0);  // Go ahead and start up the oscillator
  }

  on() {
    this.oscillator.frequency.cancelScheduledValues(0);
    this.oscillator.frequency.setTargetAtTime(noteNumToFreq(this.note), 0, PORTAMENTO);
    this.envelope.gain.cancelScheduledValues(0);
    this.envelope.gain.setTargetAtTime(1.0, 0, ATTACK);
  }
  off(){ 
    this.envelope.gain.cancelScheduledValues(0);
    this.envelope.gain.setTargetAtTime(0.0, 0, RELEASE );
    this.oscillator.frequency.cancelScheduledValues(0);
    this.oscillator.frequency.setTargetAtTime( noteNumToFreq(this.note), 0, PORTAMENTO );
  }
}

export {Synth}
