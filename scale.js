var _ = require("underscore")
exports.noteOnly = function(noteName){
  return noteName.split("/")[0]
}

exports.octaveOnly = function(noteName){
  return noteName.split("/")[1]
}

exports.accidental = function(noteName){
    var accidental = noteName.indexOf("#")
    accidental = accidental < 0 ? noteName.indexOf("b") : accidental
    if(accidental>=0){
      return noteName[accidental]
    }
}


// progressions
// I IV 
// I V
// I IV V
// I IV V7
// I IV I V
// I IV I V7
// I IV V IV
// I V vi IV
// I ii IV V
// I ii V 
// I vi ii V
// I vi IV V
// I vi ii IV V7
// i vi ii V7 ii 
// IV I IV V
// ii7 V7 I
// I IV I V7 IV I
// I IV I V7 IV I
// I IV vii° iii vi ii V I

var notes = [ 'c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'g#', 'a', 'bb', 'b' ]
var enharmonics = [["c#","db"], ["eb","d#"], ["f#", "gb"], ["g#", "ab"], ["bb", "a#"]]
exports.notes = notes
exports.enharmonics = enharmonics

var scaleMaps = {
  'cMajor': [ 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B' ]
}
exports.scaleMaps = scaleMaps
var tones = scaleMaps.cMajor
function canonicalize(note){
	// if the note is already canonical, return it
	var index = _.indexOf(notes, note)
	if(index >= 0){
		return note
	}
	// otherwise find the canonical enharmonic and return that
	index = _.find(enharmonics, function(x){ return x[1] == note })
	if(index >= 0){
		return enharmonics[index][0]
	}
}                           
exports.canonicalize = canonicalize

var supportedChords = [
	{ name: "", fullname: "major", 
	  gen: function(i) {
			  return [tones[i], tones[(i + 4) % 12], tones[(i + 7) % 12]]
			}
	},
	{ name: "m", fullname: "minor",
	  gen: function(i) {
		return [tones[i], tones[(i + 3) % 12], tones[(i + 7) % 12]]
	  }
	}, 
	{ name: "dim", fullname: "diminished",
	  gen: function(i) {
		return [tones[i], tones[(i + 3) % 12], tones[(i + 6) % 12]]
	  }
	}, 
	{ name: "aug", fullname: "augmented",
	  gen: function(i) {
		return [tones[i], tones[(i + 4) % 12], tones[(i + 8) % 12]]
	  }
	},
 ]
supportedChords = supportedChords.concat([
	{ name: "7", fullname: "seventh",
	  gen: function(i){
		return chordTypeByName("").gen(i).concat(tones[(i + 10) % 12])
	  }
	},
	{ name:"maj7", fullname: "major 7th",
	  gen: function(i){
		return chordTypeByName("").gen(i).concat(tones[(i + 11) % 12])
	  }
	},
	{ name:"m7", fullname: "minor 7th",
	  gen: function(i){
		return chordTypeByName("m").gen(i).concat(tones[(i + 10) % 12])
	  }
	}
])
exports.supportedChords = supportedChords
var chordTypeByName = function(name){
	return _.find(supportedChords, function(x){return x.name == name})
}                 
exports.chordTypeByName = chordTypeByName
var Steps= {
	"Major" : [2, 2, 1, 2, 2, 2,1],
	"Minor" : [2, 1, 2, 2, 1, 2, 2],
	"Harmonic Minor": [2, 1, 2, 2, 1, 3, 1],
	"Blues": [3, 2, 1, 1, 3],
}
exports.Steps = Steps
exports.intervals = {
		"minor 2nd":1,
		"major 2nd":2,
		"major 3rd":4, 
		"minor 3rd": 3,
		"perfect 4th": 5,
		"diminished 5th": 6,
		"perfect 5th": 7, 
		"augmented 5th": 8,
		"major sixth": 9,
		"minor seventh": 10,
		"major seventh": 11,
		"octave": 12,
	}
exports.Chords = supportedChords
exports.getChordInProgression= function(key, symbol){
	var mapping = {"I":0, "II":2, "III":4, "IV":5, "V":7, "VI":9, "VII":11}
	var isMinor = symbol.toLowerCase() == symbol
	key = canonicalize(key)
	var c = chordTypeByName(isMinor ? "m" : "")
	var noteIndex = (_.indexOf(notes, key) + mapping[symbol.toUpperCase()]) % notes.length
	console.log(noteIndex)
	return c.gen(noteIndex)
}

exports.generate = function(tonic, steps, octaves){
	var out = []
	out.push(tonic)
	var octave = parseInt(exports.octaveOnly(tonic))
	var note = this.canonicalize(exports.noteOnly(tonic))
	var noteIndex = _.indexOf(notes, note)
	//var octaves = octaves || 1
	for(var j=octaves;j>0;j--){
		for(var i=0;i<steps.length;i++){
			noteIndex += steps[i]
			if(noteIndex > notes.length-1){
				octave += 1
				noteIndex = noteIndex % notes.length
			}
			out.push(notes[noteIndex] + "/" + octave)
		}
	}
	return out
}
