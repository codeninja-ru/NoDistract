// ==UserScript==
// @name         NoDistract
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  an attempt to take over the world!
// @author       You
// @match        https://2ch.hk/*
// @match        https://www.youtube.com/*
// @match        https://mangadex.org/*
// @match        https://readmanganato.com/*
// @grant GM_setValue
// @grant GM_getValue
// @run-at document-start
// @downloadURL https://raw.githubusercontent.com/codeninja-ru/NoDistract/main/src/nodistract.user.js#bypass=true
// @updateURL https://raw.githubusercontent.com/codeninja-ru/NoDistract/main/src/nodistract.user.js#bypass=true
// ==/UserScript==


(function(document) {
    'use strict';

    const rules = {
        '2ch.hk': {
            allowance: {
                hours: [10, 16, 20, 21, 22, 23, 24, 0],
            },
        },
        'mangadex.org': {
            allowance: {
                hours: [9, 10, 16, 20, 21, 22, 23],
            },
        },
        'www.youtube.com': {
            allowance: {
                hours: [9, 10, 16, 20, 21, 22, 23],
            },
        },
        'readmanganato.com': {
            allowance: {
                hours: [9, 10, 16, 20, 21, 22, 23],
            },
        },
    };

    function not(fn) {
        return (...args) => {
            return !fn.apply(this, args);
        };
    }

    function htmlAllowedHours(hours) {
        return `<div class="allowed"><div class="allowed__h">Access is allowed at</div>${hours.map((hour) => '<div class="allowed__hour">' + hour + '</div>').join('')}</div>`;
    }

    function htmlHits(hits) {
        //todo escape htis
        return `<ul class="hits">${hits.map(item => `<li class="hit"><img src=${item.icon} class="hit_icon"><div class="hit_title">${item.title}</div><div class="hit_url">${item.url}</div></li>`).join('')}</ul>`;
    }

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
</style>
</head>
<body>
    <div class="blocker">
        <div class="blocker__msg">
            the page is blocked
        </div>
        <div class="blocker__allowed">${allowed}</div>
    </div>
    ${htmlHits(GM_getValue('noDistract_hits', []))}
</body>
`);
    }

    const domain = document.location.hostname;

    const rule = rules[domain];
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
                GM_setValue('noDistract_hits', [hit, ...(GM_getValue('noDistract_hits'), [])]);
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
