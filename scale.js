function noteOnly(noteName){
  return noteName.split("/")[0]
}

function octaveOnly(noteName){
  return noteName.split("/")[1]
}

function accidental(noteName){
    var accidental = noteName.indexOf("#")
    accidental = accidental < 0 ? noteName.indexOf("b") : accidental
    if(accidental>=0){
      return noteName[accidental]
    }
}

var Scale = function(){
  notes = [ 'c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'g#', 'a', 'bb', 'b' ]
  enharmonics = [["c#","db"], ["eb","d#"], ["f#", "gb"], ["g#", "ab"], ["bb", "a#"]]

  return {
    Types : [
    { name: "", fullname: "major", 
      gen:  function(i) {
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
    /*
     * { name: "aug", fullname: "augmented",
      gen: function(i) {
        return [tones[i], tones[(i + 4) % 12], tones[(i + 8) % 12]]
      }
    },
    { name: "7", fullname: "seventh",
      gen: function(i){
        return major.gen(i).concat(tones[(i + 10) % 12])
      }
    },
    { name:"maj7", fullname: "major7th",
      gen: function(i){
        return major.gen(i).concat(tones[(i + 11) % 12])
      }
    },
    { name:"m7", fullname: "minor7th",
      gen: function(i){
        return minor.gen(i).concat(tones[(i + 10) % 12])
      }
    }
      */
    ],
    Steps:{
      "Major" : [2, 2, 1, 2, 2, 2,1],
      "Minor" : [2, 1, 2, 2, 1, 2, 2],
      "Harmonic Minor": [2, 1, 2, 2, 1, 3, 1],
    },

  canonicalize : function(note){
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
  },

  generate : function(tonic, steps, octaves){
    var out = []
    out.push(tonic)
    var octave = parseInt(octaveOnly(tonic))
    var note = this.canonicalize(noteOnly(tonic))
    var noteIndex = _.indexOf(notes, note)
    var octaves = octaves || 1
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
  },
  }

}()
