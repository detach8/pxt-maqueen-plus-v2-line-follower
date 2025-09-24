
> Open this page at [https://detach8.github.io/pxt-maqueen-plus-v2-line-follower/](https://detach8.github.io/pxt-maqueen-plus-v2-line-follower/)

# Line Follower for Maqueen Plus V2

This is a basic line follower for the DFRobot Maqueen Plus V2 which does not have the built-in PID
line follower like the Maqueen V3.

Line following termination modes:
* Junction: When two outer sensors detect a line (T-junction)
* Junction: When middle and left outer sensor detect a line (Left junction)
* Junction: When middle and right outer sensor detect a line (Right junction)
* Lost track: When all front sensors loses track of a line
* Ultrasonic: When ultrasonic sensor detects obstacle within minimum distance

Turn termination modes:
* Outer sensor detection off: When all front sensors detect a line and the inside sensor passes it
* Outer sensor detection on: When the near-side outer sensor (L2/R2), then all front sensors detect a line and the inside sensor passes it

Additional features:
* Move forward for fixed duration - useful for positioning before a turn
* Read and display line sensor state using the last row of micro:bit LED - add this to your forever loop to see line sensor activity 

Todo:
* PID version of line follower; current line follower at default speeds work well but at higher speeds, PID might work better

Author: Justin Lee <tzlee@tzlee.com>

## Use as Extension

This repository can be added as an **extension** in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **New Project**
* click on **Extensions** under the gearwheel menu
* search for **https://github.com/detach8/pxt-maqueen-plus-v2-line-follower** and import

## Edit this project

To edit this repository in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **Import** then click on **Import URL**
* paste **https://github.com/detach8/pxt-maqueen-plus-v2-line-follower** and click import

#### Metadata (used for search, rendering)

* for PXT/microbit
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
