// bun has no browser window, and the store needs one: the app slice reads the layout when it
// loads, and the modules behind the actions register page listeners and insert styles. this
// stands in for just enough of one. load the store with a dynamic import once it is installed,
// and uninstall it when the file ends, since every test file shares the process

type TViewport = {
  width: number;
  defaultFontSize: number;
};

const PHONE_VIEWPORT: TViewport = { width: 390, defaultFontSize: 16 };

const viewport: TViewport = { ...PHONE_VIEWPORT };

const MIN_WIDTH_QUERY = /^\(min-width: ([\d.]+)(px|rem)\)$/;

const noop = () => {};

// answers the min-width queries the layout helpers ask the way a browser does, rem against the
// browser's default font size whatever the page sets. nothing else matches
const matchMedia = (query: string) => {
  const match = MIN_WIDTH_QUERY.exec(query);
  let matches = false;

  if (match) {
    const [, value, unit] = match;
    const scale = unit === 'rem' ? viewport.defaultFontSize : 1;

    matches = viewport.width >= Number(value) * scale;
  }

  return { matches, addEventListener: noop, removeEventListener: noop };
};

const setViewport = (next: Partial<TViewport>) => {
  Object.assign(viewport, next);
};

const installBrowserStub = () => {
  globalThis.window = {
    matchMedia,
    addEventListener: noop,
    removeEventListener: noop
  } as never;

  globalThis.document = {
    addEventListener: noop,
    removeEventListener: noop,
    head: { appendChild: noop },
    createElement: () => ({ appendChild: noop }),
    createTextNode: noop
  } as never;

  return () => {
    Object.assign(viewport, PHONE_VIEWPORT);

    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  };
};

export { installBrowserStub, setViewport };
