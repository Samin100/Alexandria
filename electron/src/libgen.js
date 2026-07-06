// Library Genesis access: searching and resolving download links.
//
// The original libgen.rs/.is/.st family went offline in early 2025, so this
// targets the surviving libgen.li fork family. Each mirror serves the same
// database; we try them in order until one responds.

const axios = require("axios").default;
const cheerio = require("cheerio");

const MIRRORS = [
  "https://libgen.li",
  "https://libgen.la",
  "https://libgen.bz",
  "https://libgen.vg",
];

// some mirrors reject requests with no browser user agent
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

const searchLibgen = async (searchQuery) => {
  // returns an array of book objects, [] when the query has no results,
  // or null when every mirror failed
  for (const mirror of MIRRORS) {
    try {
      const response = await axios.get(`${mirror}/index.php`, {
        params: {
          req: searchQuery,
          res: 50,
        },
        headers: HEADERS,
        timeout: 15000,
      });
      if (response.status === 200) {
        return parseSearchResults(response.data, mirror);
      }
    } catch (e) {
      console.log(`libgen search via ${mirror} failed: ${e.message}`);
    }
  }
  return null;
};

const parseSearchResults = (html, mirror) => {
  const $ = cheerio.load(html);
  let books = [];

  $("table#tablelibgen tbody tr").each(function (i, row) {
    const cells = $(row).children("td");
    if (cells.length < 9) {
      return;
    }

    // the first cell holds series/edition links and badges; the edition link
    // carries the actual title
    let title = cells.eq(0).find('a[href*="edition.php"]').first().text().trim();
    if (!title) {
      title = cells.eq(0).find("a").first().text().trim();
    }

    // the libgen mirror link is an ads.php page keyed by the file's md5
    const mirrorHref = cells
      .eq(8)
      .find('a[href*="ads.php"]')
      .first()
      .attr("href");
    if (!mirrorHref || !title) {
      return;
    }
    const md5 = (mirrorHref.match(/md5=([a-fA-F0-9]{32})/) || [])[1];

    books.push({
      id: md5 || `result-${i}`,
      md5: md5,
      title: title,
      author: cells.eq(1).text().replace(/\(Author\)/g, "").trim(),
      publisher: cells.eq(2).text().trim(),
      year: cells.eq(3).text().trim(),
      language: cells.eq(4).text().trim(),
      pages: cells.eq(5).text().trim(),
      size: cells.eq(6).text().trim(),
      extension: cells.eq(7).text().trim(),
      mirror1: new URL(mirrorHref, mirror).href,
    });
  });
  return books;
};

const getDownloadUrl = async (mirrorPageUrl) => {
  // the mirror page (ads.php) contains a keyed one-time download link (get.php)
  const response = await axios.get(mirrorPageUrl, {
    headers: HEADERS,
    timeout: 20000,
  });
  const $ = cheerio.load(response.data);
  const href = $('a[href*="get.php"]').first().attr("href");
  if (!href) {
    return null;
  }
  return new URL(href, mirrorPageUrl).href;
};

const sanitizeFilename = (name) => {
  // strips characters that break paths on macOS
  return name
    .replace(/[/\\:\0]/g, "-")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 250);
};

const filenameFromResponse = (response, fallbackName) => {
  // mirrors vary between the RFC 5987 form (filename*=UTF-8''...) and the
  // plain quoted form, so handle both
  const disposition = response.headers["content-disposition"] || "";

  let match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (match) {
    try {
      return sanitizeFilename(decodeURIComponent(match[1]));
    } catch (e) {
      // fall through to the other forms
    }
  }

  match =
    disposition.match(/filename="([^"]+)"/i) ||
    disposition.match(/filename=([^;]+)/i);
  if (match) {
    return sanitizeFilename(match[1]);
  }

  return sanitizeFilename(fallbackName);
};

module.exports = {
  searchLibgen,
  getDownloadUrl,
  filenameFromResponse,
  sanitizeFilename,
  HEADERS,
};
