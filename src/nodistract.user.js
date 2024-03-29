// ==UserScript==
// @name         NoDistract
// @namespace    http://tampermonkey.net/
// @version      0.2.28
// @description  an attempt to take over the world!
// @author       You
// @match        https://2ch.hk/*
// @match        https://www.youtube.com/*
// @match        https://mangadex.org/*
// @match        https://readmanganato.com/*
// @match        https://asura.gg/*
// @match        https://reaperscans.com/*
// @match        https://flamescans.com/*
// @grant GM_setValue
// @grant GM_getValue
// @run-at document-start
// @downloadURL https://raw.githubusercontent.com/codeninja-ru/NoDistract/main/src/nodistract.user.js
// @updateURL https://raw.githubusercontent.com/codeninja-ru/NoDistract/main/src/nodistract.user.js
// ==/UserScript==


(function(document) {
    'use strict';

    const rules = {
        '2ch.hk': {
            allowance: {
                hours: [10, 16, 20, 21, 22, 23, 24, 0],
            },
            urls: ['2ch.*', 'm2ch.*'],
        },
        'mangadex.org': {
            allowance: {
                hours: [9, 10, 16, 20, 21, 22, 23],
            },
            urls: ['mangadex.org'],
        },
        'www.youtube.com': {
            allowance: {
                hours: [9, 10, 16, 20, 21, 22, 23],
            },
            urls: ['youtube.com', '*.youtube.com'],
        },
        'manga': {
            allowance: {
                hours: [9, 10, 16, 20, 21, 22, 23],
            },
            urls: ['*manga*', 'asura.gg', 'reaperscans.com', 'flamescans.org']
        },
    };

    function encodeHTML(unsafe) {
        return unsafe.replace(/[&<"']/g, function(m) {
            switch (m) {
                case '&':
                    return '&amp;';
                case '<':
                    return '&lt;';
                case '"':
                    return '&quot;';
                default:
                    return '&#039;';
            }
        });
    }

    function not(fn) {
        return (...args) => {
            return !fn.apply(this, args);
        };
    }

    function htmlAllowedHours(hours) {
        return `<div class="allowed"><div class="allowed__h">Access is allowed at</div>${hours.map((hour) => '<div class="allowed__hour">' + hour + '</div>').join('')}</div>`;
    }

    function htmlHits(hits) {
        return `<ul class="hits">${hits.map(item => `<li class="hit"><img src="${encodeURI(item.icon)}" class="hit__icon"><div class="hit__title">${encodeHTML(item.title)}</div><a href="${encodeURI(item.url)}" class="hit__url" target="__blank">${encodeHTML(item.url)}</a></li>`).join('')}</ul>`;
    }

    function wildcardMatch(str, rule) {
        var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        return new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);
    }

    var store = {
        get: (name) => {
            try {
                return JSON.parse(GM_getValue('noDistract_' + name, '[]'));
            } catch (e) {
                return [];
            }
        },
        set: (name, value) => {
            return GM_setValue('noDistract_' + name, JSON.stringify(value));
        }
    };

    function block(allowed) {
        document.write(`<!doctype html>
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body, html {
  height: 100%;
}
body {
  background: #eee;
  color: #444;
  display: flex;
  align-items: center;
  margin: 0;
}
.blocker {
  margin: 0 auto;
  width: 1024px;
  position: relative;
}
.blocker__msg {
  text-align: center;
  font-size: 48px;
}
.allowed {
  text-align: center;
  margin: 30px 0;
}
.allowed_h {
  font-size: 28px;
}
.allowed__hour {
  display: inline-block;
  padding: 5px 15px;
  margin: 5px 5px;
  background: #444;
  color: #fff;
  font-size: 36px;
}
.hits {
  position: absolute;
  width: 760px;
  margin: 0 auto;
  padding: 0;
}
.hit {
  color: #555;
  padding: 0;
  margin: 0;
  font-size: 14px;
  list-style: none;
  overflow: hidden;
  text-overflow: ellipsis;
  clear: both;
}
.hit .hit__icon {
  width: 32px;
  height: 32px;
  float: left;
}
.hit .hit__title, .hit .hit__url {
  display: block;
}
.hit .hit__url {
  text-overflow: ellipsis;
  text-decoration: underline;
  color: #555;
  white-space: nowrap;
}
.hit .hit__url:hover {
  text-decoration: none;
}
</style>
</head>
<body>
    <div class="blocker">
        <div class="blocker__msg">
            the page is blocked
        </div>
        <div class="blocker__allowed">${allowed}</div>
        ${htmlHits(store.get('hits'))}
    </div>
</body>
`);
    }

    const domain = document.location.hostname;

    const [ruleGroup, rule] = Object.entries(rules).find(([key, rule]) => {
        return rule.urls.some((pattern) => wildcardMatch(domain, pattern));
    });
    if (rule && rule.allowance && rule.allowance.hours) {
        const hours = rule.allowance.hours;
        var blockerFn = () => {
            const currentTime = new Date();
            const currentHour = currentTime.getHours();
            const shouldBeBlockedNow = hours.every(not((allowedHour) => {
                return currentHour == allowedHour;
            }));

            if (shouldBeBlockedNow) {
                var icon = document.querySelector("link[rel*='icon']");
                var hit = {
                    title: document.title,
                    icon: icon ? icon.href : 'https://s2.googleusercontent.com/s2/favicons?domain=' + domain,
                    url: window.location.href,
                    time: Date.now(),
                };
                store.set('hits', [hit, ...store.get('hits').filter(item => item.url != hit.url)]);
                console.log(hit);
                block(htmlAllowedHours(hours));
            }

            const nextBlockHour = Math.min.apply(Math, rule.allowance.hours.map((hour) => hour < currentHour ? (24 - currentHour) + hour : hour - currentHour));
            if (nextBlockHour == 0) {
                const timeout = nextBlockHour * 3600 * 1000 - (currentTime.getMinutes() * 60 * 1000 + currentTime.getSeconds() * 1000);
                setTimeout(blockerFn, timeout);
            }
        };

        blockerFn();


    }

})(document);
