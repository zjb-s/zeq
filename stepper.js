/*

zeq beta 0.1 test test
1/0 and true/false are used interchangeably.
--
inlet   0   bang to advance sequences
--
outlet  0   play/pause bang
outlet  1   messages to serialosc
outlet  2   outputs track number whenever a track triggers
--
*/
inlets = 1;
outlets = 3;
var active = 0;
var tracks = emptyArray(4).map(makeSequence);
var playing = false;
var mod = { // modifier key states 
    end: false,
    edit: false,
    shift: false,
};

function emptyArray(length, value) {
    var arr = []
    var i
    for (i = 0; i < length; i++) {
        arr.push(value)
    }
    
    return arr
}

function makeSequence () { // sequence constructor
    var sequence = {
        steps: emptyArray(16).map(makeStep), // make a new one rather than slicing the same one, don't need templateSequence at all
        position: 0, // position in sequence
        len: 15, // length
        mute: false, // mute state
        qs: 0 // queued sample
    }
    sequence.currentStep = sequence.steps[0]
    return sequence
}

function makeStep () { // step constructor
    return {
        on: false,
        sample: 0,
        velocity: 127
    }
}

function advanceSequence(sequence, steps) {
    if (typeof steps === 'undefined') {
        steps = 1
    }

    return setSequencePosition(sequence, sequence.position + steps)
}

function resetSequence(sequence) {
    return setSequencePosition(sequence)
}

function setSequenceToEnd(sequence) {
    return setSequencePosition(sequence, sequence.len)
}

function setSequencePosition(sequence, newPosition) {
    sequence.position = newPosition % (sequence.len + 1)
    sequence.currentStep = sequence.steps[sequence.position]
    return sequence
}

function getActiveTrack() {
    return tracks[active]
}

function getXY(n) { // takes a position 0-15, returns [x,y] for use in grid
    if (n > 15) { return; post('position out of bounds') }
    var x; var y // return x, return y
    if (n < 8) {
        x = n
        y = 0
    } else {
        x = n - 8
        y = 1
    }
    return [x, y]
}

function bang() { // advance the sequence, redraw, echo
    // for (i=0;i<4;i++) { // iterate and wrap each position
    //     tracks[i].position++
    //     if (tracks[i].position > tracks[i].l) { tracks[i].position = 0 }
    // }

    // Esther: refactored the two loops into one iterator
    tracks.forEach(function(currentTrack, i) {
        //increment position and wrap around after .len steps using modulo division
        //currentTrack.position = (currentTrack.position + 1) % currentTrack.len

        advanceSequence(currentTrack)
        if (currentTrack.currentStep) {
            outlet(2, i)
            //post('\n track trigger: ' + i)
        }
    })

    // for (i=0;i<4;i++) { // for each track
    //     if (tracks[i].steps[tracks[i].position]) { // if the current step is active...
    //         outlet(2, i) // push the track number from third outlet 
    //         post('\n track trigger: ' + i)
    //     }
    // }

    redraw()
}

function modkey(m) {
    m = m.split(' ')
    var x = m[0]
    var y = m[1]
    var z = m[2]

    if (x == 5 && y == 2) { // endpoint
        mod.end = z
        post('\n modkey: end: ' + mod.end)
    } else if (x == 0 && y == 15) { // shift
        mod.shift = !mod.shift
        post('\n modkey: shift: ' + mod.shift)
    } else if (x == 4 && y == 2 && z == 1) { // toggle edit
        mod.edit = !mod.edit
        post('\n edit mode: ' + mod.edit)
        // illuminate sample pads
        if (mod.edit) { outlet(1, '/monome/grid/led/level/map 0 0 \
                    0 0 0 0 0 0 0 0 \
                    0 0 0 0 0 0 0 0 \
                    0 0 0 0 0 0 0 0 \
                    8 8 8 8 0 0 0 0 \
                    8 8 8 8 0 0 0 0 \
                    8 8 8 8 0 0 0 0 \
                    8 8 8 8 0 0 0 0 \
                    8 8 8 8 0 0 0 0 \
        ')} else {
            outlet(1, '/monome/grid/led/level/map 0 0 \
                    0 0 0 0 0 0 0 0 \
                    0 0 0 0 0 0 0 0 \
                    0 0 0 0 0 0 0 0 \
                    4 4 4 4 0 0 0 0 \
                    4 4 4 4 0 0 0 0 \
                    4 4 4 4 0 0 0 0 \
                    4 4 4 4 0 0 0 0 \
                    4 4 4 4 0 0 0 0 \
        ')}
    }

    redraw()
}

function editStepSequences(x, y) {
    post("editing")
    var position;
    var activeTrack = getActiveTrack()
    if (mod.end == 1) {
        activeTrack.len = (x + y * 8)
        post('\n modified end point of track ' + active + ' to ' + activeTrack.len)
    } else if (mod.edit) {
        position = x + y * 8 // get seq position from x/y
        var editStep = activeTrack.steps[position]
        post('\n before: ' + activeTrack.currentStep.on)
        if (editStep.on) {
            //activeTrack.steps[activeTrack.position] = makeStep() // reset step
            editStep.on = false
            editStep.velocity = 127
            editStep.sample = activeTrack.qs
        } else {
            editStep.on = true
        }
    }
    post(activeTrack.steps[0].on)
}

function clear() {
    if (mod.shift) { // clear all sequences
        tracks = tracks.map(makeSequence)
        //for (i=0;i<4;i++) {tracks[i] = templateSequence.slice()}
    } else { // or just the active one
        tracks[active] = makeSequence()
    }
    post('\n clear sequence ' + a)
}

function changeTrackFocus(x, y) {
    if (mod.shift) {
        tracks[x].mute = !tracks[x].mute // toggle track mute
        post('\n sequence ' + x + ' mute state: ' + tracks[x].mute)
    } else {
        active = x
        post('\n focus sequence ' + active)
    }
}

function coinFlip() {
    return Math.random() > 0.5
}

function randomizeSequence(x, y) {
    post('\n randomizing sequence')
    getActiveTrack().steps.map(coinFlip)
}

function playPause() {
    playing = !playing
    post('\n toggled playing')
    outlet(0, playing ? 1 : 0)
    if (!playing) {
        //for (i=0;i<4;i++) { tracks[i].position = tracks[i].len }
        tracks.forEach(setSequenceToEnd)
    }
}

function gridkey(input) { // general grid button functionality
    var parsedInput = input.split(' ')
    var x = parseInt(parsedInput[0], 10)
    var y = parseInt(parsedInput[1], 10)
    
    var rp; // return position
    post('\n key: [ ' + x + ', ' + y + ' ]')
    if (y < 2) { //edit the step sequences
        editStepSequences(x, y)
    } else if (y == 2 && x < 4) { // change track focus
        changeTrackFocus(x, y)
    } else if (y == 2 && x == 7) { // clear
        clear()
    } else if (x == 6 && y == 2) { // randomize sequence
        randomizeSequence(x, y)
    } else if (x < 4 && y > 2 && y < 8 && mod.edit) { // if edit mode is on, enter live notes on sample pads
        tracks[x].steps[tracks[x].position].on = true // set current step to active
        tracks[x].steps[tracks[x].position].sample = y - 3
        post('\n track sample key: track ' + x + ', sample ' + (y-3))

    } else if (x == 7 && y == 15) { // play/pause button
        playPause()
    }
    
    redraw()
}

function drawSequenceRows() {
    // render sequence information
    var row1 = emptyArray(8, 0)
    var row2 = emptyArray(8, 0)

    for (i=0;i<8;i++) {
        if (getActiveTrack().steps[i].on) { row1[i] = 15 }
        if (getActiveTrack().steps[i + 8].on) { row2[i] = 15 }
    }
    var rs1 = row1.join(' ') // temp strings for rendering
    var rs2 = row2.join(' ') 
    outlet(1, '/monome/grid/led/level/row 0 0 ' + rs1)
    outlet(1, '/monome/grid/led/level/row 0 1 ' + rs2)

    if (getActiveTrack().steps[getActiveTrack().position].on) { // if the step is active
        outlet(1, '/monome/grid/led/level/set ' + getXY(getActiveTrack().position)[0] + ' ' + getXY(getActiveTrack().position)[1] + ' 8')
    } else {
        outlet(1, '/monome/grid/led/level/set ' + getXY(getActiveTrack().position)[0] + ' ' + getXY(getActiveTrack().position)[1] + ' 4')
    }
}

function drawStatusBar() {

    var activeTrack = getActiveTrack()
    //status bar, row 2
    var statusbar = [2,2,2,2,4,4,4,4]
    if (activeTrack.mute) { // if the active track is muted
        statusbar[active] = 4
    } else {
        statusbar[active] = 15
    }
    //statusbar[a] = 15
    if (mod.end == 1) { // illuminate endpoint key + actual sequence endpoint for active track
        statusbar[5] = 15
        outlet(1, '/monome/grid/led/level/set ' + getXY(activeTrack.len)[0] + ' ' + getXY(activeTrack.len)[1] + ' ' + 15)
    }
    if (mod.edit) { statusbar[4] = 15}
    outlet(1, '/monome/grid/led/level/row 0 2 ' + statusbar.join(' ')) // render statusbar
}

function drawGlobalBar() {
    //global keys, bottom row (15)
    var globalbar = [4,4,4,4,4,4,4,4]
    if (playing) {globalbar[7] = 15}
    if (mod.shift) {globalbar[0] = 15}
    outlet(1, '/monome/grid/led/level/row 0 15 ' + globalbar.join(' ')) // render global bar
}

function redraw() { // redraw grid leds. visual block only - does not modify any states
    drawSequenceRows()
    drawStatusBar()
    drawGlobalBar()
}
