//var MIDI = require("./MIDI.js")
var $ = require("jquery")
$(document).ready(function(){
  console.log(MIDI, MIDI.noteOn)
    MIDI.loadPlugin(
      { 
      soundfontUrl:"/",
      instrument: "acoustic_grand_piano",
        onsuccess:function(x){
          console.log("loaded", x)
        }
      }
    )
    setTimeout(function(){
		var delay = 0; // play one note every quarter second
		var note = 50; // the MIDI note
		var velocity = 127; // how hard the note hits
		// play the note
		MIDI.setVolume(0, 127);
		MIDI.noteOn(0, note, velocity, delay);
		console.log("hi")
    }, 1000)
})

