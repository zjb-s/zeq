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
todo:
- refactor rendering so it stores the whole grid in a 2d array, then outputs it in 2 osc messages
*/
inlets = 1;
outlets = 3;

var active;
var tracks;
var playing;
var panelVelocity;
var mod;
var renderMatrix;

function reset() {
    active = 0;
    tracks = emptyArray(4).map(makeSequence);
    playing = false;
    panelVelocity = 7;
    mod = { // modifier key states 
        end: false,
        edit: false,
        shift: false,
    };
    renderMatrix = emptyArray(16).map(function () { return emptyArray(8, 0)});
    post('\n initialized. ')
    render()
}

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
        activeSample: 0 // queued sample
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

function getTrack(which) {
    return tracks[which]
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

function bang() { // advance the sequence, redraw
    tracks.forEach(function(currentTrack, i) {
        advanceSequence(currentTrack)
        if (currentTrack.currentStep) {
            outlet(2, i)
        }
    })
    render()
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
        //drawMaps() todo: implement

    }

    render()
}

function editStepSequences(x, y) {
    var position;
    var activeTrack = getActiveTrack()
    if (mod.end == 1) {
        activeTrack.len = (x + y * 8)
        post('\n modified end point of track ' + active + ' to ' + activeTrack.len)
    } else if (mod.edit) {
        position = x + y * 8 // get seq position from x/y
        var editStep = activeTrack.steps[position]
        if (editStep.on) {
            editStep.on = false
            editStep.velocity = 8
            editStep.sample = activeTrack.activeSample
        } else {
            editStep.on = true
        }
    }
    post(activeTrack.steps[0].on)
}

function clear() { // todo: this currently resets the sequence to the start - it shouldn't
    if (mod.shift) { // clear all sequences
        tracks = tracks.map(makeSequence)
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

function randomizeSequence(x, y) {
    post('\n randomizing sequence')
    if (mod.shift) { // if shift is pressed, randomize all sequences
        tracks.forEach(function(t) {
            t.steps.forEach(function(s) {
                s.on = Math.random() > 0.5
            })
        })
    } else { // or just the active one
        getActiveTrack().steps.forEach(function(element) {
            element.on = Math.random() > 0.5
        })
    }
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

    //post('\n key: [ ' + x + ', ' + y + ' ]')
    if (y < 2) { //edit the step sequences
        editStepSequences(x, y)
    } else if (y == 2 && x < 4) { // change track focus
        changeTrackFocus(x, y)
    } else if (y == 2 && x == 7) { // clear
        clear()
    } else if (x == 6 && y == 2) { // randomize sequence
        randomizeSequence(x, y)
    } else if (x < 4 && y > 3 && y < 12) { //sample pads
        editSamplePads(x, y)
    } else if (x == 7 && y > 3 && y < 12) { // adjust velocity
        editVelocity(y)
    } else if (x == 7 && y == 15) { // play/pause button
        playPause()
    }
    
    render()
}

function editSamplePads(x, y) {
    var editStep = getTrack(x).steps[getTrack(x).position]
    if (mod.shift) {
        getTrack(x).activeSample = 11 - y
    } else {
        if (mod.edit) {
            editStep.on = true
            editStep.velocity = panelVelocity
            editStep.sample = 11 - y
        } 
    }
}

function editVelocity(y) {
    panelVelocity = (11 - (y))
    post('\n panelVelocity: ' + panelVelocity)
}


function drawSequenceRows() { // updated to use new matrix system
    for (i=0;i<8;i++) {
        if (getActiveTrack().steps[i].on) { drawCell(i, 0, 15) }
        if (getActiveTrack().steps[i + 8].on) { drawCell(i, 1, 15) }
    }

    if (getActiveTrack().steps[getActiveTrack().position].on) { // if the step is active
        drawCell(getXY(getActiveTrack().position)[0], getXY(getActiveTrack().position)[1], 8)
    } else {
        drawCell(getXY(getActiveTrack().position)[0], getXY(getActiveTrack().position)[1], 4)
    }
}

function drawStatusBar() { // updated to use new matrix system

    var activeTrack = getActiveTrack()
    drawRow(0,2,[2,2,2,2,4,4,4,4])
    if (activeTrack.mute) {
        drawCell(active, 2, 4)
    } else {
        drawCell(active, 2, 15)
    }
    if (mod.end == 1) { drawCell(5, 2, 15) }
    if (mod.edit) { drawCell(4, 2, 15) }

}

function drawGlobalBar() {
    drawRow(0, 15, [4,4,4,4,4,4,4,4])
    if (playing) { drawCell(7, 15, 15) }
    if (mod.shift) { drawCell(0, 15, 15) }
}

// function redraw() { // redraw grid leds. visual block only - does not modify any states
//     drawSequenceRows()
//     drawStatusBar()
//     drawGlobalBar()
// }

function drawVelocityBar() {
    drawColumn(7, 4, [4,4,4,4,4,4,4,4])
    drawCell(7, 11 - panelVelocity, 15)
}

function drawSamplePads() {
    var background = mod.edit ? [4,4,4,4,4,4,4,4] : [2,2,2,2,2,2,2,2]
    var foreground = mod.edit ? 15 : 10
    for (var i = 0; i < 4; i++) {
        post('\n drawing column at ' + i)
        drawColumn(i, 4, background)
        drawCell(i, 11 - getTrack(i).activeSample, foreground)
    }
}

function drawRow (x, y, vals) {
    for (i=0; i<vals.length; i++) {
        drawCell(x+i, y, vals[i])
    }
}
function drawColumn (x, y, vals) {
    //post('\n drawColumn')
    for (i=0; i<vals.length; i++) {
        drawCell(x, y+i, vals[i])
    }
}
function drawCell(x, y, val) {
    //post('\n drawCell: [' + x + ', ' + y + '] = ' + val)
    if (typeof x === 'number' && typeof y === 'number' && typeof val === 'number') { renderMatrix[y][x] = val }
}
function render() { // concatenate matrix into osc, then send

    // take care of sections...
    drawSequenceRows()
    drawStatusBar()
    drawGlobalBar()
    drawVelocityBar()
    drawSamplePads()

    // then assemble everything...
    var concatRows = renderMatrix.map(function(row, i) { 
        return row.join(" "); 
    })
    var topHalf = concatRows.slice(0,8).join(' ')
    var bottomHalf = concatRows.slice(8,16).join(' ')

    outlet(1, '/monome/grid/led/level/map 0 0 ' + topHalf) // top half
    outlet(1, '/monome/grid/led/level/map 0 8 ' + bottomHalf) // bottom half
    //post('\n rendered.')
    renderMatrix = emptyArray(16).map(function () { return emptyArray(8, 0)});
}

