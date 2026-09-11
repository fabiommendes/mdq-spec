Consider the following pseudocode, which estimates the great-circle
distance between two points on Earth's surface.

```
function distance(lat1, lon1, lat2, lon2):
    R = 6371
    return R * acos(sin(lat1) * sin(lat2) +
                    cos(lat1) * cos(lat2) * cos(lon2 - lon1))
```

Explain why this formula assumes the Earth is a perfect sphere, and name
one source of error this introduces when applied to real distances, such
as between Manaus and Belém.

[essay]
