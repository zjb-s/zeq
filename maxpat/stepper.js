/*

zeq beta 0.2 
--
inlet   0   bang to advance sequences
--
outlet  0   unused currently
outlet  1   messages to serialosc
outlet  2   outputs step information whenever a track triggers
--
todo:
-- steps often don't register with their correct velocity / prob values when live playing or editing. step editing seems to work ok
*/
inlets = 1;
outlets = 3;
var tracks;
var panel;
var mod;
var renderMatrix;
var clock;
var doNotTrigger;

function reset() {
    renderMatrix = emptyArray(16).map(function () { return emptyArray(8, 0)}); // this is used to store the grid visually, which is sent to grid by render()
    panel = { // "default" or panel values to apply to steps
        velocity: 7,
        probability: 7,
        playing: false,
        page: 0,
        blink: false,
        active: 0,
    };
    tracks = emptyArray(4).map(makeSequence);
    mod = { // modifier key states 
        end: false,
        edit: false,
        shift: false,
    };
    clock = false; // flip-flop to advance
    doNotTrigger = [false, false, false, false] // this prevents double-triggering when live playing into the sequencing
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
        steps: emptyArray(64).map(makeStep), // make a new one rather than slicing the same one, don't need templateSequence at all
        position: 0, // position in sequence
        len: 15, // length
        mute: false, // mute state
        activeSample: 0, // queued sample
        pages: [true, false, false, false]
    }
    sequence.currentStep = sequence.steps[0]

    return sequence
}

function makeStep () { // step constructor
    return {
        on: false,
        sample: 0,
        velocity: panel.velocity,
        selected: false,
        probability: panel.probability
    }
}

function advanceSequence(sequence, steps) {
    if (typeof steps === 'undefined') { steps = 1 } // default value
    var newPosition = sequence.position + steps;

    // wrap for muted pages; needs work
    while (!sequence.pages[Math.floor(newPosition / 16)] && sequence.pages[Math.floor(newPosition / 16)] < 8) {newPosition += 16} 

    return setSequencePosition(sequence, newPosition)
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
    return tracks[panel.active]
}

function getTrack(which) {
    return tracks[which]
}

function getXY(n) { // takes a position 0-15, returns [x,y] for use in grid
    while (n > 15) { n -= 16 }
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
    if (panel.playing) {
        clock = !clock
        if (clock) {
            tracks.forEach(function(currentTrack, i) {
                advanceSequence(currentTrack)
                var step = currentTrack.currentStep
                if (step.on && (Math.random() * 7 < step.probability) && !currentTrack.mute && !doNotTrigger[i]) {
                    outlet(2, 
                        step.sample + ' '
                        + Number( step.velocity * 16 ) + ' '
                        + Number( i + 1 )
                    )
                }
            })
            panel.blink = !panel.blink
            render()
        }
        doNotTrigger.map(function(e) {e = false;})
    }
}

function editStepSequences(x, y) {
    var position = (x + y * 8) + (panel.page * 16) // converting x/y info + page info into an integer position
    var activeTrack = getActiveTrack()
    var editStep = activeTrack.steps[position]
    if (mod.end) {
        activeTrack.len = ((x + y * 8) + (panel.page * 16))
        post('\n modified end point of track ' + panel.active+ ' to ' + activeTrack.len)
    } else if (mod.edit) {
        if (editStep.on) {
            if (mod.shift) {
                editStep.selected = !editStep.selected
            } else {
                editStep.on = false;
            }
        } else {
            post('\n turning step on')
            editStep.on = true;
            editStep.selected = false;
            editStep.velocity = panel.velocity
            editStep.probability = panel.probability
        }
    } else {
        editStep.selected = !editStep.selected
    }
}

function clear() { 
    var pos = [0,0,0,0]
    tracks.forEach(function(e,i) { pos[i] = e.position }) // store positions 
    if (mod.shift) { // clear all sequences
        tracks = tracks.map(makeSequence)
    } else { // or just the active one
        tracks[panel.active] = makeSequence()
    }
    tracks.map(function(e, i) { //reassign positions to their "old" values
        e.position = pos[i]; 
        post(i)
        post(e.position)
    })
}

function changeTrackFocus(x, y) {
    if (mod.shift) {
        getTrack(x).mute = !getTrack(x).mute // toggle track mute
        post('\n sequence ' + x + ' mute state: ' + getTrack(x).mute)
    } else {
        panel.active = x
        post('\n focus sequence ' +panel.active)
    }
}

function randomizeSequence(x, y) {
    post('\n randomizing sequence')
    if (mod.shift) { // if shift is pressed, randomize all sequences
        tracks.forEach(function(t) {
            t.steps.forEach(function(s) {
                s.on = Math.random() > 0.5
                s.velocity = Math.ceil(Math.random() * 8)
            })
        })
    } else { // or just the active one
        getActiveTrack().steps.forEach(function(element) {
            element.on = Math.random() > 0.5
            element.velocity = Math.ceil(Math.random() * 9)
        })
    }
}

function playPause() {
    panel.playing = !panel.playing
    if (!panel.playing) {
        //for (i=0;i<4;i++) { tracks[i].position = tracks[i].len }
        tracks.forEach(setSequenceToEnd)
    }
}

function modKey(x, y, z) {
    if (x == 3 && y == 15) { // endpoint
        mod.end = z == 1;
    } else if (x == 0 && y == 15) { // shift
        mod.shift = z == 1;
    } else if (x == 1 && y == 15 && z == 1) { // toggle edit
        mod.edit = !mod.edit;
    }
}

function pageKey(x, y) {
    activeTrack = getActiveTrack()
    if (mod.shift) {
        activeTrack.pages[x - 4] = !activeTrack.pages[x - 4]
    } else if (mod.end) {
        activeTrack.len = (16 * (x - 4)) + 15
    } else {
        panel.page = x - 4
    }
}

function key(x, y) {
    //post('\nkey')
    if (y < 2) { //edit the step sequences
        editStepSequences(x, y)
    } else if (y == 2 && x < 4) { // change track focus
        changeTrackFocus(x, y)
    } else if (y == 2 && x > 3) {
        pageKey(x, y)
    } else if (x == 5 && y == 15) { // clear
        clear()
    } else if (x == 4 && y == 15) { // randomize sequence
        randomizeSequence(x, y)
    } else if (x < 4 && y > 3 && y < 12) { //sample pads
        editSamplePads(x, y)
    } else if (x == 7 && y > 3 && y < 12) { // adjust velocity
        editVelocity(y)
    } else if (x == 6 && y > 3 && y < 12) {
        editProbability(y)
    } else if (x == 7 && y == 15) { // play/pause button
        playPause()     
    }
}

function gridKey(input) { // general grid button functionality
    var parsedInput = input.split(' ')
    var x = parseInt(parsedInput[0], 10)
    var y = parseInt(parsedInput[1], 10)
    var z = parseInt(parsedInput[2], 10)
    if (z == 1) { key(x, y) } // if it's a key on, send to key()
    modKey(x, y, z)
    render()
}

function editSamplePads(x, y) { // process presses on the sample pads
    // if clock is false, we're in the second half of the step, so select the next one (round to nearest step)
    var editStep = getTrack(x).steps[getTrack(x).position + (clock ? 0 : 1)] 
    doNotTrigger[x] = !clock

    if (mod.edit) {
        editStep.on = true
        editStep.velocity = panel.velocity
        editStep.sample = 11 - y
        outlet(2, Number(11-y) + ' ' + Number(panel.velocity*16) + ' ' + Number(x+1)) // play midi note
    }
    if (!mod.edit || (mod.edit && mod.shift)) {
        getTrack(x).activeSample = 11 - y
    }
}

function editVelocity(y) {
    panel.velocity = (11 - (y))
    updateSelectedSteps()
    post('\npanel velocity: '+panel.velocity)
}

function editProbability(y) {
    panel.probability = (11 - (y))
    updateSelectedSteps()
    post('\npanel probability: '+panel.probability)
}

function updateSelectedSteps() {
    tracks.forEach(function(t) {
        t.steps.map(function(step, i) {
            if (step.selected) {
                step.velocity = panel.velocity
                step.probability = panel.probability
            }
        })
    })
}

function stepIsOnPage(number) {
    return Math.floor(number / 16) == panel.page;
}

function drawSequenceRows() { 
    var t = getActiveTrack()
    for (i=0;i<8;i++) { // draw top 2 rows
        var thisStep = t.steps[i + panel.page * 16]
        var thisStep2 = t.steps[i + 8 + panel.page * 16]
        if (thisStep.on) { // first row
            drawCell(i, 0, (thisStep.selected && panel.blink) ? 10 : 15)
        }
        if (thisStep2.on) {  // second row
            drawCell(i, 1, (thisStep2.selected && panel.blink) ? 10 : 15)
        }
    }
    if (stepIsOnPage(t.position)) { // if we're viewing the cursor page
        drawCell(getXY(t.position)[0], getXY(t.position)[1], t.steps[t.position].on ? 8 : 4) // draw the cursor
    }
    if (mod.end && Math.floor(t.len / 16) == panel.page) { drawCell( getXY(t.len)[0], getXY(t.len)[1], 15) } // if endpoint key is held, show the endpoint
}

function drawStatusBar() {
    drawRow(0,2,[2,2,2,2]) // tracks background
    var activeTrack = getActiveTrack()
    drawCell(panel.active, 2, activeTrack.mute ? 4 : 15) // illuminate active track
    activeTrack.pages.forEach(function (e, i) { drawCell(i + 4, 2, activeTrack.pages[i] ? 8 : 2) }) // draw page mute states
    drawCell(panel.page + 4, 2, 15)
    if (panel.blink && panel.playing) { drawCell(Math.floor(activeTrack.position / 16) + 4, 2, 13) } // playhead cursor page
}

function drawGlobalBar() {
    drawCell(0, 15, mod.shift ? 15 : 4) // shift
    drawCell(1, 15, mod.edit ? 15 : 4) // edit
    drawCell(3, 15, mod.end ? 15 : 4) // endpoint
    drawRow(4, 15, [4, 4])
    drawCell(7, 15, panel.playing ? 15 : 4) // playing
}

function drawVelocityBar() {
    drawColumn(7, 4, [4,4,4,4,4,4,4,4])
    drawCell(7, 11 - panel.velocity, 15)
}

function drawProbabilityBar() {
    drawColumn(6, 4, [4,4,4,4,4,4,4,4])
    //post('\n'+panel.probability)
    drawCell(6, 11 - panel.probability, 15)
}

function drawSamplePads() {
    var background = mod.edit ? [4,4,4,4,4,4,4,4] : [2,2,2,2,2,2,2,2]
    var foreground = mod.edit ? 15 : 10
    for (var i = 0; i < 4; i++) {
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
    for (i=0; i<vals.length; i++) {
        drawCell(x, y+i, vals[i])
    }
}
function drawCell(x, y, val) {
    //post('\n drawCell: [' + x + ', ' + y + '] = ' + val)
    if (typeof x === 'number' && typeof y === 'number' && typeof val === 'number') {
        if (x < 8 && y < 16) { renderMatrix[y][x] = val } // make sure x and y are on the grid
    }
}
function render() { // concatenate matrix into osc, then send

    // take care of sections...
    drawSequenceRows()
    drawStatusBar()
    drawGlobalBar()
    drawVelocityBar()
    drawProbabilityBar()
    drawSamplePads()
    

    // then assemble everything...
    var concatRows = renderMatrix.map(function(row, i) { 
        return row.join(" "); 
    })
    var topHalf = concatRows.slice(0,8).join(' ')
    var bottomHalf = concatRows.slice(8,16).join(' ')

    // then send:
    outlet(1, '/monome/grid/led/level/map 0 0 ' + topHalf) // top half
    outlet(1, '/monome/grid/led/level/map 0 8 ' + bottomHalf) // bottom half
    //post('\n rendered.')
    renderMatrix = emptyArray(16).map(function () { return emptyArray(8, 0)});
}
