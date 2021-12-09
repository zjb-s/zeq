Render = {}

function Render:go()
    Render:screen()

    g:all(0)

    Render:trackSelect()
    Render:sequences()
    Render:samplePads()
    Render:globals()

    g:refresh()
end

function Render:screen()
    screen.clear()

    -- progress bars rectangle
    screen.level(4)
    screen.rect(1, 1, 64, 32)
    screen.stroke()

    -- global progress bar
    screen.level(15)
    screen.move(3, 5)
    screen.line_width(4)
    screen.line_rel(util.linlin(0, params:get('reset'), 0, 59, panel.counter), 0)
    screen.stroke()
    screen.line_width(1)

    -- track progress bars todo: need to fix the visuals here
    -- screen.level(15)
    -- screen.move(3, 10)
    -- for i=1,4 do
    --     screen.line_rel(util.linlin(0, tracks[i].len, 0, 59, tracks[i].position), 0)
    --     screen.move(3, i * 6 + 9 )
    -- end

    -- velocity and probability bars
    screen.level(15)
    screen.move(101, 8)
    screen.text('!!')
    screen.move(117, 8)
    screen.text('%')
    screen.rect(96, 64, 16, - (util.linlin(0, 127, 0, 53, params:get('velocity'))))
    screen.rect(112, 64, 16, - (util.linlin(0, 100, 0, 53, params:get('probability'))))
    screen.stroke()

    -- live rec notification
    if params:get('rec') == 1 then -- todo maybe remove this
        screen.level((params:get('playing') == 1) and 15 or 5)
        screen.move(20, 10)
        screen.text('LIVE RECORDING!')
    end

    -- post 
    screen.level(8)
    screen.move(0,60)
    screen.text('> ' .. panel.post)
    
    -- clean up
    screen.update()
end

function Render:samplePads()
    for i=1,4 do
        local t = tracks[i]
        for x=1,4 do
            if mod.showPages then -- showPages
                local val = (panel.pages[i] == x) and 15 or 5
                if not t.pages[x] then val = (panel.pages[i] == x) and 8 or 2 end
                g:led(x + 9, i * 2, val)
                g:led(x + 9, i * 2 - 1, val)

            else -- or show sample pads
                local val = (i == panel.active) and 6 or 2
                g:led(x + 9, i * 2, val)
                g:led(x + 9, i * 2 - 1, val)
                local sampleNumber = t.activeSample
                local sampleModifier = (sampleNumber > 4) and 0 or 1
                g:led(9 + util.wrap(sampleNumber, 1, 4), i * 2 - sampleModifier, 15)
            end
        end
    end
end

function Render:trackSelect()
    for i=1,4 do
        local val
        val = i == panel.active and 15 or 4
        if tracks[i].mute then val = 2 end
        g:led(9,i*2, val)
        g:led(9,i*2-1, val)
        if i == panel.active then 
            for j=1,8 do
                g:led(j,i*2,2); g:led(j,i*2-1,2)
            end

        end
    end
end

function Render:sequences()
    if panel.mode == 4 then -- if viewing 4 tracks
        for i=1, 4 do -- for each track
            local t = tracks[i]
            for s=1, 8 do -- for each step
                local rstep1 = t.steps[s + (panel.pages[i] - 1) * 16]
                local rstep2 = t.steps[s + 8 + (panel.pages[i] - 1) * 16]
                if rstep1.on then -- top row of sequence
                    g:led(s, (i * 2) - 1, 15)
                end
                if rstep2.on then -- bottom row
                    g:led(s, (i * 2), 15)
                end
            end
            if (util.round_up(t.position / 16, 1) == panel.pages[i]) and (params:get('playing') == 1) then -- if cursor is on currently viewed page...
                local x = util.wrap(t.position, 1, 8)
                y = (((util.wrap(t.position, 1, 16) > 8) and 2 or 1) + i * 2) - 2 -- probably a better way to do this lol todo
                g:led(x, y, t.steps[t.position].on and 8 or 4) -- 8 if step is off, 4 if on
                if mod.Endpoint then 
                    g:led(x, (((util.wrap(t.position, 1, 16) > 8) and 2 or 1) + i * 2) - 2)
                end
            end
        end
    end
end

function Render:globals() 
    g:led(16, 1, mod.shift and 15 or 8) -- shift key
    g:led(16, 2, mod.Endpoint and 15 or 8) -- endpoint key
    g:led(16, 4, mod.showPages and 15 or 4)
    g:led(16, 5, not mod.showPages and 15 or 4) -- show pages toggle
end

return Render;