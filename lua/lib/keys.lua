x = 0
y = 0
z = 0

local Keys = {}

function Keys:playPause()
    if params:get('playing') == 1 then 
        panel.post = 'stop'
        m:stop()
        params:set('playing', 0)
        for i=1,4 do tracks[i].position = tracks[i].len end
    else
        panel.post = 'play'
        m:start()
        params:set('playing', 1)
    end
    panel.counter = 0
end

function Keys:toggleRec()
    params:set('rec', (params:get('rec') == 0) and 1 or 0)
end

function Keys:samplePads()
    panel.post = 'track ' .. (util.round_up(self.y / 2, 1)) .. ' sample ' .. ((self.x - 9) + (self.y % 2 == 0 and 4 or 0))
    local t = tracks[util.round_up(self.y / 2, 1)]
    t.activeSample = (self.x - 9) + (self.y % 2 == 0 and 4 or 0)
    if params:get('rec') == 1 then 
        local s = t.steps[t.position]
        initStep(s)
        s.on = true;
    end
end

function Keys:pages()
    local trackNum = util.round_up(self.y / 2, 1)
    local pageNum = self.x - 9
    if mod.Endpoint then 
        tracks[trackNum].len = pageNum * 16
    else
        if mod.shift then 
            tracks[trackNum].pages[pageNum] = not tracks[trackNum].pages[pageNum]
            panel.post = ((tracks[trackNum].pages[pageNum] and 'unmute' or 'mute') .. ' page ' .. (pageNum) .. ' [T' .. trackNum .. ']')
        else
            panel.pages[trackNum] = pageNum
            panel.post = 'track ' .. trackNum .. ' page ' .. pageNum
        end
    end
end

function Keys:sequences()
    local rtrack; local rstep; local rpos
    if self.z == 1 then
        if panel.mode == 4 then -- if we're viewing 4 tracks
            rtrack = tracks[util.round(self.y / 2, 1)]
            rpos = self.x + ((self.y % 2 == 0) and 8 or 0)  -- if y is even, add 8 to index (second row)
            rstep = rtrack.steps[rpos]
        end
        -- todo: implement hold functinoality here
        if mod.Endpoint then
            rtrack.len = rpos
        else
            if rstep.on then rstep.on = false -- turn step off
            else 
                initStep(rstep)
                rstep.on = true
                print('turned step ' .. rpos .. ' on')
            end
        end
        print('step velocity is ' .. rstep.velocity)
    end
end

function Keys:trackFocus()
    local n = util.round(self.y / 2, 1)
    if mod.shift then
        tracks[n].mute = not tracks[n].mute
        panel.post = (tracks[n].mute and 'mute' or 'unmute') .. ' track ' .. n
    else 
        panel.active = n
        panel.post = ('focus track ' .. panel.active)
    end
    print('track ' .. panel.active .. ' now active')
end

function Keys:shift()
    if self.z == 1 then panel.post = 'shift' end
    mod.shift = (self.z == 1)
end

function Keys:Endpoint()
    if self.z == 1 then panel.post = 'endpoint' end
    mod.Endpoint = (self.z == 1)
end

function Keys:showPages()
    local b = self.y == 4
    mod.showPages = b
    panel.post = 'show ' .. (b and 'pages' or 'samples')
end

return Keys