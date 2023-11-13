import * as utilities from "./utilities.js";
import * as serverVariables from "./serverVariables.js";
import { log } from "./log.js";
let cachedRequestsExpirationTime = serverVariables.get(
  "main.repository.CacheExpirationTime"
);

globalThis.cachedRequests = [];

export default class CachedRequestsManager {
  static add(url, content, ETag = "") {
    /* mise en cache */
    log("url utilisé : " + url);
    if (url != null) {
      if ([content, ETag] != CachedRequestsManager.find(url))
        CachedRequestsManager.clear(url);
      cachedRequests.push({
        url: url,
        content: content,
        ETag: ETag,
        Expire_Time: cachedRequestsExpirationTime,
      });
      log(
        FgGreen,
        `${url} is added to cached requests. There are now ${cachedRequests.length} cached requests`
      );
      // log(FgGreen, `${CachedRequestsManager.find(url)} is added to cached requests`);
    }
  }

  static find(url) {
    /* retourne la cache associée à l'url */
    try {
      if (url != "") {
        for (let request of cachedRequests) {
          if (request.url == url) {
            request.Expire_Time =
              utilities.nowInSeconds() + cachedRequestsExpirationTime;
            log(FgYellow, url + " is found in cached requests");
            return [request.content, request.ETag];
          }
        }
      }
    } catch (error) {
      log(BgRed, FgWhite, "cached request error!", error);
    }
    return null;
  }
  static clear(url) {
    if (url != "") {
      let indexToDelete = [];
      let index = 0;
      for (let endpoint of cachedRequests) {
        // target all entries related to the same APIendpoint url base
        if (endpoint.url.toLowerCase().indexOf(url.toLowerCase()) > -1)
          indexToDelete.push(index);
        index++;
      }
      utilities.deleteByIndex(cachedRequests, indexToDelete);
      log(FgRed, url + " removed from cached requests");
    }
  }
  static flushExpired() {
    /* efface les caches expirées */
    let indexToDelete = [];
    let index = 0;
    let now = utilities.nowInSeconds();
    for (let request of cachedRequests) {
      if (request.Expire_Time < now + cachedRequestsExpirationTime) {
        log(FgCyan, "Cached request of " + request.url + " is expired");
        indexToDelete.push(index);
      }
      index++;
    }
    utilities.deleteByIndex(cachedRequests, indexToDelete);
  }
  static get(HttpContext) {
    if (HttpContext !== undefined) {
      log(FgWhite, "Rechercher un cached request avec " + HttpContext.req.url);
      const result = CachedRequestsManager.find(HttpContext.req.url);
      if (result !== null) {
        const [content, ETag] = result;
        log("pas nulle");
        return HttpContext.response.JSON(content, ETag, true);
      }
      log("Aucun cached requests trouvé");
      // return HttpContext.response.JSON(HttpContext);
    }
    log("Aucun contexte Http");
    return null;
  }
}

setInterval(
  CachedRequestsManager.flushExpired,
  cachedRequestsExpirationTime * 1000
);
