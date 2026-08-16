const QueueHubStorage={
  kind:'localStorage',
  load(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch(e){console.warn('QueueHub storage load failed',e);return null}},
  save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){console.warn('QueueHub storage save failed',e);return false}},
  remove(key){try{localStorage.removeItem(key);return true}catch(e){return false}}
};
