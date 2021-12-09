g = grid.connect()
local keys = include('zeq/lib/keys')
local render = include('zeq/lib/render')

function init() 
    addParams()
    panel = {
        pages = {1, 1, 1, 1},
        blink = false,
        active = 1,
        mode = 4,
        post = 'initialized!',
        counter = 1
    }
    mod = {
        Endpoint = false,
        edit = false,
        shift = false,
        showPages = false
    }
    tracks = {}
    for i=1,4 do tracks[i] = makeSequence() end
    print('zeq initialized!')

    clock.run(tick)
    render:go()
end

function addParams()
    params:add_separator('panel & globals')
    params:add_number('quant', 'quantize changes to', 1, 64, 16)
    params:add_number('reset', 'reset on step', 1, 1024, 64)
    params:add_number('velocity', 'velocity', 0, 127, 100)
    params:add_number('probability','probability',0,100,100)
    params:add_number('rec','recording?',0,1,0)
    params:add_number('playing','playing?',0,1,0)

end

function tick() 
    while true do
        clock.sync(1/4)
        if params:get('playing') == 1 then

            panel.counter = panel.counter + 1
            if panel.counter > params:get('reset') then 
                panel.counter = 0
                for k,v in ipairs(tracks) do v.position = v.len end
            end

            for i=1,4 do 
                tracks[i]:advance() 
                local s = tracks[i].steps[tracks[i].position]
                if s.on then 
                    --todo: implement engine & midi
                end
            end
            render:go()
        end
    end
end

function makeSequence() 
    local returnTable = {
        steps = {},
        position = 1,
        len = 64,
        mute = false,
        pages = {true, false, false, false},
        activeSample = 6
    }
    for i=1,64 do
        returnTable.steps[i] = makeStep()
    end

    function returnTable:advance(steps) 
        local allMuted
        local steps = steps or 1
        for k,v in ipairs(self.pages) do
            if v then break end
            if k == 4 then allMuted = true end
        end
        if allMuted then 
            self.position = self.len
        else
            local newPosition = self.position + steps
            for i=1,4 do
                if not self.pages[util.wrap(util.round_up((newPosition / 16), 1), 1, 4)] then 
                    print('util.round_up(newPosition / 16, 1) = ' .. util.round_up(newPosition / 16, 1))
                    print('page ' .. i .. ' is muted')
                    newPosition = newPosition + 16
                end
            end
            self.position = util.wrap(newPosition, 1, self.len)
        end
    end

    return returnTable
end

function makeStep()
    return {
        on = false,
        sample = 1,
        velocity = params:get('velocity'),
        selected = false,
        probability = params:get('probability'),
        inTrack = 1
    }
end

function initStep(s) -- takes a step and initializes all values
    s.on = false
    s.sample = 1
    s.velocity = params:get('velocity')
    s.selected = false
    s.probability = params:get('probability')
end

function g.key(x,y,z)
    keys.x = x; keys.y = y; keys.z = z
    if x < 9 then
        keys:sequences()
    elseif x == 9 and z == 1 then
        keys:trackFocus()
    elseif x > 9 and x < 14 and z == 1 and not mod.showPages then
        keys:samplePads()
    elseif x > 9 and x < 14 and z == 1 and mod.showPages then
        keys:pages()
    elseif x == 16 and y == 1 then
        keys:shift()
    elseif x == 16 and y == 2 then
        keys:Endpoint()
    elseif x == 16 and y > 3 and y < 6 and z == 1 then 
        keys:showPages()
    end
    render:go()
end

function enc(n,d)
    if n == 2 or n == 4 then
        params:delta('velocity', d)
        panel.post = 'velocity: ' .. params:get('velocity')
    elseif n == 3 then 
        params:delta('probability', d)
        panel.post = 'probability: ' .. params:get('probability') .. '%'
    end
    render:go()
end

function key(n, d)
    if d == 1 then 
        if n == 3 then
            keys:playPause()
        elseif n == 2 then
            keys:toggleRec()
        end
    end
    render:go()
end