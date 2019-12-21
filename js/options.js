function save_options() {

  const smartBlock = Boolean(document.getElementById('smart-block').checked);
  const gAPIkey = document.getElementById('api-key').value;

  if(smartBlock && !gAPIkey){
    alert("Provide a valid API key or disable the feature");
    return;
  }

  var opts = csapuntz.siteblock.read_options();
    
  opts.rules = document.getElementById('rules').value;
  opts.allowed = Number(document.getElementById('allowed').value);
  opts.period = Number(document.getElementById('period').value) * 60;
  opts.smart_block = smartBlock;
  opts.api_key = gAPIkey;

  csapuntz.siteblock.write_options(opts);

  chrome.extension.getBackgroundPage().onOptionsChanged(opts);

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);

}

function restore_options() {
  var opts = csapuntz.siteblock.read_options();

  document.getElementById("rules").value = opts.rules;
  document.getElementById("allowed").value = opts.allowed;
  document.getElementById("period").value = opts.period / 60;
  document.getElementById("smart-block").checked = opts.smart_block;
  document.getElementById("api-key").value = opts.api_key || "";
}

function on_load() {
    restore_options();
    toggle_key_visible();

    document.querySelector('#submit').addEventListener('click', save_options);
    document.getElementById("smart-block").onclick = toggle_key_visible;
}

function toggle_key_visible() {
  let isOn = document.getElementById("smart-block").checked;
  document.getElementById("api-key").hidden = !isOn;
}

document.addEventListener('DOMContentLoaded', on_load);
