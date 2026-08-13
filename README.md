# Git Calendar Web Client
A web client for [git-calendar/core](https://github.com/git-calendar/core)

Also using:  
- Better date API: [Luxon](https://github.com/moment/luxon)
- Handy utilities: [VueUse](https://vueuse.org)
- Translations: [i18n](https://vue-i18n.intlify.dev)
- Icons: [vue-icons](https://vue-icons.com/icons/fi)

### Build/run locally
```sh
npm install         # download dependencies
npm run fetch-wasm  # download compiled wasm core from github releases (you can compile it yourself though)
npm run dev         # run locally
```

### TODO
- [x] logo (git + calendar ?)
- [x] multiple calendars
- [x] tags
  - [x] colors
- [x] repetition
- [x] multi-day events bar
- [x] dragging shortcuts
  - [x] drag to create event
  - [x] drag horizontally for multi-day event
  - [x] drag to move existing event
- [x] month view
- [x] mobile friendly
  - [x] basic responsiveness
  - [x] verify drag-to-create on ios etc.
- [ ] prettier tag/color picker
- [x] infinite repeat option
