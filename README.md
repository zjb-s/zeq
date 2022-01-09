# zeq beta 0.2
performance sequencer for norns & grid 128

# what?
**zeq** is:
- a performance sequencer, inspired by the way i use my octatrack
- 4 tracks of 1 - 64 steps each

# use
- the **left half** of the grid shows 4 **sequence lanes**. one for each track. you can add steps by poking the sequence keys.
- the **center column** is the **track select**. Currently, selecting a track doesn't do anything, but you can mute tracks with shift+track.
- the far **right column** is the **global** panel. from top to bottom:
- - shift: hold this to access a second layer of functionality on the grid. mute tracks or pages, etc.
- - endpoint: hold this and press a step or page to set each track's endpoint
- - page / sample mode toggle: switched between grid view modes.
- **right side** blocks:
- - in **sample mode** (default) these show the 8 samples available on each track. pressing one of them selects that sample, for use in step sequencing. you can also live record into the sequence using these pads.
- - in **pages** mode, these show the 4 pages for each track. you can view, mute and unmute (shift)the pages by pressing them.



# in progress
roadmap:
- better readme with graphics
- implement a sampler engine
- add p-lock functionality by holding down steps (shouldn't be hard)
- better screen visuals
- fix rendering track positions on screen
- change live recording notification to something better
- fix this line: //todo1 in render.lua
- add more view modes (currently only 1)