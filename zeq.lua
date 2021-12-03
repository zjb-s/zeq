g = grid.connect()
render = {}
keys = {}

function init()
    keys = {
        x = 0,
        y = 0,
        z = 0
    }
    panel = {
        velocity = 7,
        probability = 7,
        page = 1,
        blink = false,
        active = 1,
        mode = 4,
        playing = false
    }
    mod = {
        reset = false,
        edit = false,
        shift = false
    }
    tracks = {}
    for i=1,4 do tracks[i] = makeSequence() end
    print('initialized!')

    clock.run(tick)
    render:go()
end

function render:go()
    render:screen()
    g:all(0)
    render:trackSelect()
    render:sequences()
    render:samplePads()
    render:globals()
    g:refresh()
end

function render:screen()
    screen.clear()

    screen.level(panel.playing and 15 or 5)
    for i=1,4 do 
        screen.move(10, 8 * i)
        screen.level(panel.playing and 15 or 5)
        screen.text_right(panel.playing and ((tracks[i].position < 10 and '0' or '') .. tracks[i].position) or '--')
    end

    screen.update()
end

function render:samplePads()
    for i=1,4 do
        local t = tracks[i]
        for x=1,4 do
            local val = i == panel.active and 6 or 2
            g:led(x + 9, i * 2, val)
            g:led(x + 9, i * 2 - 1, val)
            local sampleNumber = t.activeSample
            local sampleModifier = sampleNumber > 4 and 1 or 0
            g:led(9 + util.wrap(sampleNumber, 1, 4), i * 2 - sampleModifier, 15)
        end
    end
end

function render:trackSelect()
    for i=1,8 do
        local val = i == panel.active and 15 or 4
        g:led(9,i*2, val)
        g:led(9,i*2-1, val)
        if i == panel.active then 
            for j=1,8 do
                g:led(j,i*2,2); g:led(j,i*2-1,2)
            end

        end
    end
end

function render:sequences()
    if panel.mode == 4 then -- if viewing 4 tracks
        for i=1, 4 do -- for each track
            local t = tracks[i]
            for s=1, 8 do -- for each step
                local rstep1 = t.steps[s + (panel.page - 1) * 16]
                local rstep2 = t.steps[s + 8 + (panel.page - 1) * 16]
                if rstep1.on then -- top row of sequence
                    g:led(s, (i * 2) - 1, 15)
                end
                if rstep2.on then -- bottom row
                    g:led(s, (i * 2), 15)
                end
            end
            if (util.round_up(t.position / 16, 1) == panel.page) and panel.playing then -- if cursor is on currently viewed page...
                local x = util.wrap(t.position, 1, 8)
                y = (((util.wrap(t.position, 1, 16) > 8) and 2 or 1) + i * 2) - 2 -- probably a better way to do this lol todo
                g:led(x, y, t.steps[t.position].on and 8 or 4) -- 8 if step is off, 4 if on
            end
        end
    end
end

function render:globals() 
    g:led(16,8, panel.playing and 15 or 8)
end

function keys:playPause()
    if panel.playing then 
        panel.playing = false
        for i=1,4 do tracks[i].position = tracks[i].len end
    else
        panel.playing = true
    end
end

function keys:samplePads()
    local t = tracks[round_up(self.y / 2, 1)]
    t.activeSample = (self.x - 9) + (self.y % 2 and 4 or 0)
end

function keys:sequences(x,y,z)
    local rtrack; local rstep
    if z == 1 then
        if panel.mode == 4 then -- if we're viewing 4 tracks
            rtrack = tracks[util.round(self.y / 2, 1)]
            rstep = rtrack.steps[x + ((self.y % 2 == 0) and 8 or 0)] -- if y is even, add 8 to index (second row)
        end
        -- todo: implement hold functinoality here
        if rstep.on then rstep.on = false -- turn step off
        else rstep.on = true; print('turned step ' .. x + ((self.y % 2 == 0) and 8 or 0) .. ' on') end -- make a new step with panel values
    end
end

function keys:trackFocus()
    if mod.shift then
        tracks[util.round(self.y / 2, 1)].mute = not tracks[util.round(self.y / 2, 1)].mute
    else 
        panel.active = util.round(self.y / 2, 1)
    end
    print('track ' .. panel.active .. ' now active')
end

function keys:page()
    local rTrack = tracks[panel.active]
    if mod.shift then 
        rTrack.pages[self.x-4] = not rTrack.pages[self.x-4]
    elseif mod.reset then
        rTrack.len = 16 * (self.x - 5) + 16
    else
        panel.page = self.x-4
    end
end

function tick() 
    while true do
        clock.sync(1/4)
        if panel.playing then
            for i=1,4 do tracks[i]:advance() end
            render:go()
        end
    end
end

function makeSequence() 
    local returnTable = {
        steps = {},
        position = 1,
        len = 16,
        mute = false,
        pages = {true, false, false, false},
        activeSample = 6
    }
    for i=1,64 do
        returnTable.steps[i] = makeStep()
    end

    function returnTable:advance(steps) 
        steps = steps or 1
        local newPosition = self.position + steps
        self.position = util.wrap(newPosition, 1, self.len)
        print('position now '..self.position)
    end

    return returnTable
end

function makeStep()
    return {
        on = false,
        sample = 1,
        velocity = panel.velocity,
        selected = false,
        probability = panel.probability
    }
end

function g.key(x,y,z)
    keys.x = x; keys.y = y; keys.z = z
    if x<9 then 
        keys:sequences()
    elseif x == 9 and z == 1 then 
        keys:trackFocus()
    elseif x > 9 and x < 14 then 
        keys:samplePads()
    elseif x == 16 and y == 8 and z == 1 then 
        keys:playPause()
    end
    render:go()
end


