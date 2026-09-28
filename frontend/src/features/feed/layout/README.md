# Feed panel layout

Persisted widths/order/visibility are user preferences. `FeedWorkspace` measures
its own container after the shell/sidebar takes its space. `fitPanels` derives
rendered widths from that budget and the separator gap; viewport changes do not
write preferences. Resizing commits the actual rendered panel sizes.

When minima no longer fit, filters remain available through the existing header
popover. If list and detail cannot fit together, the selected vacancy occupies
one panel; “До списку” returns to the list without clearing selection. Wider
containers restore the preferred panels automatically. Each panel owns its
vertical scroll; the shell clipping must never hide a required panel or action.
