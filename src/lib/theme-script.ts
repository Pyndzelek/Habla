/** localStorage key holding all progress & settings. */
export const STORAGE_KEY = "habla:v1";

/**
 * Runs inline before first paint so a saved dark preference never flashes light.
 * Must stay self-contained: it's serialized into a <script> tag.
 */
export const THEME_BOOTSTRAP = `try{var t=(JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}").settings||{}).theme;if(t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch(e){}`;
