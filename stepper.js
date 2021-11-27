/*
zeq beta 0.1 test change
1/0 and true/false are used interchangeably.
--
inlet   0   bang to advance sequences
--
outlet  0   play/pause bang
outlet  1   messages to serialosc
outlet  2   outputs track number whenever a track triggers
--
*/

function makeSequence () {
    return {
        s: templateSequence.slice(), // sequence contents
        p: 0, // position
        l: 15, // length
        m: false // muted?
    }
}

inlets = 1;
outlets = 3;

a = 0 // active track
t = [[],[],[],[]] //track array
templateSequence = [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false] // blank seq
for (i=0;i<4;i++) { t[i] = makeSequence() }
// ps = [0,0,0,0] // positions
// ls = [15,15,15,15] //lengths
playing = false // playing or paused
mod = { // modifier switch states 
    end: false,
    rec: false,
    shift: false,
}
function getXY(n) { // takes a position 0-15, returns [x,y] for use in grid
    if (n > 15) { return; post('position out of bounds') }
    if (n < 8) {
        rx = n
        ry = 0
    } else {
        rx = n - 8
        ry = 1
    }
    return [rx, ry]
}

function bang() { // advance the sequence, redraw, echo
    for (i=0;i<4;i++) { // iterate and wrap each position
        t[i].p++
        if (t[i].p > t[i].l) { t[i].p = 0 }
    }

    for (i=0;i<4;i++) { // for each track
        if (t[i][t[i].p]) { // if the current step is active...
            outlet(2, i) // push the track number from third outlet 
        }
    }

    redraw()
}

function modkey(m) {
    m = m.split(' ') // [x,y,z]
    if (m[0] == 5 && m[1] == 2) { // endpoint
        mod.end = m[2]
        post('\n modkey: end: ' + mod.end)
    } else if (m[0] == 0 && m[1] == 15) { // shift
        mod.shift = !mod.shift
    } else if (m[0] == 4 && m[1] == 2 && m[2] == 1) { // toggle rec
        mod.rec = !mod.rec
        // illuminate sample pads
        if (mod.rec) { outlet(1, '/monome/grid/led/level/map 0 0 \
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

function gridkey(m) { // general grid button functionality
    rx = Number(m.split(' ')[0]); ry = Number(m.split(' ')[1]) // get key coordinates into rx,ry
    post('\n key: [ ' + rx + ', ' + ry + ' ]')
    if (ry < 2) { //edit the step sequences
        if (mod.end == 1) {
            t[a].l = rx + ry * 8
            post('\n modified end point of track ' + a + ' to ' + t[a].l)
        } else {
            rp = Number(m.split(' ')[0]) + Number(m.split(' ')[1] * 8)
            t[a][rp] = !t[a][rp]
            post('\n edit sequence ' + a)
        }
    } else if (ry == 2 && rx < 4) { // change track focus
        a = rx
        post('\n focus sequence ' + a)
    } else if (ry == 2 && rx == 7) { // clear
        if (mod.shift) { // clear all sequences
            for (i=0;i<4;i++) {t[i] = templateSequence.slice()}
        } else { // or just the active one
            t[a] = templateSequence.slice()
        }
        post('\n clear sequence ' + a)
    } else if (rx == 6 && ry == 2) { // randomize sequence
        post('\n randomizing sequence')
        for (i=0;i<16;i++) { t[a][i] = Math.random() >= 0.5 ? true : false }
    } else if (rx < 4 && ry > 2 && ry < 8 && mod.rec) { // if recording, enter live notes on sample pads
        t[rx].s[t[rx].p] = true // set current step to true
        post('\n track sample key: track ' + rx + ', sample ' + Number(ry-3))
    } else if (rx == 7 && ry == 15) { // play/pause button
        playing = !playing
        post('\n toggled playing')
        outlet(0, 'bang')
        if (!playing) {
            for (i=0;i<4;i++) { t[i].p = t[i].l }
        }
    }
    
    
    redraw()
}

function redraw() { // redraw grid leds. visual block only - does not modify any states
    // render sequence information
    rl1 = [0,0,0,0,0,0,0,0]
    rl2 = [0,0,0,0,0,0,0,0]
    for (i=0;i<8;i++) {
        if (t[a][i]) { rl1[i] = 15 }
        if (t[a][i + 8]) { rl2[i] = 15 }
    }
    rs1 = rl1.join(' ')
    rs2 = rl2.join(' ') 
    outlet(1, '/monome/grid/led/level/row 0 0 ' + rs1)
    outlet(1, '/monome/grid/led/level/row 0 1 ' + rs2)
    if (t[a].s[t[a].p]) { // if the step is active
        outlet(1, '/monome/grid/led/level/set ' + getXY(t[a].p)[0] + ' ' + getXY(t[a].p)[1] + ' 8')
    } else {
        outlet(1, '/monome/grid/led/level/set ' + getXY(t[a].p)[0] + ' ' + getXY(t[a].p)[1] + ' 4')
    }

    //status bar, row 2
    statusbar = [2,2,2,2,4,4,4,4]
    statusbar[a] = 15
    if (mod.end == 1) { // illuminate endpoint key + actual sequence endpoint for active track
        statusbar[5] = 15
        outlet(1, '/monome/grid/led/level/set ' + getXY(t[a].l)[0] + ' ' + getXY(t[a].l)[1] + ' ' + 15)
    }
    if (mod.rec) { statusbar[4] = 15}
    outlet(1, '/monome/grid/led/level/row 0 2 ' + statusbar.join(' ')) // render statusbar

    //global keys, bottom row (15)
    globalbar = [4,4,4,4,4,4,4,4]
    if (playing) {globalbar[7] = 15}
    if (mod.shift) {globalbar[0] = 15}
    outlet(1, '/monome/grid/led/level/row 0 15 ' + globalbar.join(' ')) // render global bar

}

