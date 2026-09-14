/**
 * CARTO basemap keys, published deliberately, chosen by host.
 *
 * A key in a static site is readable by anyone who opens the page; there is no
 * way round that for a client-side basemap. Each of these is restricted in the
 * CARTO console to a single origin, so what it can be used for anywhere else is
 * nothing. Stephen authorised publishing them on that basis (13 September 2026,
 * for the IHR key; the docuracy key is the one the REWT viewer already uses).
 *
 * They are NOT interchangeable. A key bound to another origin returns a
 * watermarked tile, not an error -- see the detector in map.js. Do not add an
 * unscoped key here, and when adding a host, scope its key first.
 *
 * Rotate at https://carto.com/basemaps/apikey. The IHR key's source of truth is
 * CARTO_API_KEY in the .env of ihr-markets-and-fairs; update both.
 *
 * Published copy: the keys for other origins are removed on the way
 * out (docuracy.github.io), because each is bound to its own site and
 * would be readable here for no purpose.
 */
window.CARTO_KEYS = {
    'ihr-digital.github.io': 'cb1_3j12_1_0d8d62d244097b76b2d192db',
};

/**
 * Which key this page should use.
 *
 * An origin with no key here -- localhost, or any site but this one -- gets
 * none, the detector fires, and the fallback basemap is what you see. That is the honest default: it fails the way
 * a withdrawn service would, rather than looking fine locally and breaking on
 * deployment.
 */
window.cartoKey = function () {
    return window.CARTO_KEYS[location.hostname] || null;
};
