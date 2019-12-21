// Copyright 2010-2012 Constantine Sapuntzakis

var sb = csapuntz.siteblock.newSiteBlock();
var lastTab = null;

if ("state" in localStorage) {
    sb.setState(JSON.parse(localStorage.state));
}

function block(id, tab_url)
{
  chrome.tabs.goBack(id, () => {
    if(chrome.runtime.lastError) {  //To suppress a potential error
      //The blocked tab must've been opened "in a new tab" from a whitelistd tab
      //No need to do anything special.
    }
    setTimeout( () =>
      chrome.tabs.update(id, 
              { "url" : chrome.extension.getURL("../html/blocked.html") + "?url=" + escape(tab_url) + 
                "&till=" + sb.till() + "&todays_total=" + sb.time_used_today() }), 500);
  });
}

function processTab(tab) 
{
   if(sb.blockThisTabChange(tab.id, tab.url))
     block(tab.id, tab.url);
}

function processTab2(tab)
{
   if(sb.blockThisTabChange(tab.id, tab.url))
     block(tab.id, tab.url);
   else if( !sb.isBlocked(tab.url) && timerRunning() && lastTab != null )
     sb.deref( lastTab.id );
   else if( sb.isBlocked(tab.url) && !timerRunning() )
     sb.reRefIfNeeded( tab.id );
   lastTab = tab;

   updateBadge();
}

chrome.tabs.onUpdated.addListener(
        function(tabid, changeinfo, tab) {
           if( "url" in changeinfo &&   //To avoid getting bugged with all the updates a tab can receive from the time it's requested till it's fully loaded
                tab.active ) {
            processTab(tab);
            updateBadge();
           }
        });

chrome.tabs.onRemoved.addListener(
        function(tabid) {
           sb.blockThisTabChange(tabid, null);
           updateBadge();
        });

chrome.tabs.onActivated.addListener(
        function(activeInfo) {
            chrome.tabs.get(activeInfo.tabId, processTab2);
        });

function checkBlockedTabs() {
  var a = sb.getBlockedTabs();

  for (var i = 0; i < a.length; i++)
    block(a[i].id, a[i].url);

  localStorage.state = JSON.stringify(sb.getState());
}


function onWindows(arrayWin) {
  for (var i = 0; i < arrayWin.length; i++) {
    var w = arrayWin[i];
    for (var ti = 0; ti < w.tabs.length; ti++) {
      processTab(w.tabs[ti]);
    }
  }

  setInterval(checkBlockedTabs, 30000);
}

function onOptionsChanged(opts) {
    sb.updatePaths(opts.rules);
    sb.setSmartBlock(opts.smart_block, opts.api_key);
    sb.setAllowedUsage(opts.allowed, opts.period);
}

onOptionsChanged(csapuntz.siteblock.read_options());

chrome.windows.getAll( { populate: true }, onWindows );

chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
setInterval(updateBadge, 15000);
function updateBadge() {
  let badgeTxt = '';
  if( timerRunning() )
    badgeTxt = Math.round((csapuntz.siteblock.read_options().allowed*60 - 
                          sb.getState().ut.time_used)/60).toString();
  chrome.browserAction.setBadgeText({text: badgeTxt});
}

setInterval(updateTooltip, 60000);
function updateTooltip() {
  chrome.browserAction.setTitle({title: "Total time used today: " + sb.time_used_today()});
}

function timerRunning() {
  return ( sb.getState().ut.last_start !== -1 );
}