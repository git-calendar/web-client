# Git Calendar Web Client
A web client for [git-calendar/core](https://github.com/git-calendar/core)

Also using:  
- Better date API: [Luxon](https://github.com/moment/luxon)
- Handy utilities: [VueUse](https://vueuse.org)
- Translations: [i18n](https://vue-i18n.intlify.dev)
- Icons: [vue-icons](https://vue-icons.com/icons/fi)

### Build/run locally
```sh
npm install     # download dependencies
npm fetch-wasm  # download compiled wasm core from github releases (you can compile it yourself though)
npm run dev     # run locally
```

### TODO
- [x] logo (git + calendar ?)
- [x] multiple calendars
- [ ] tags
- [x] repetition
- [ ] multi-day events bar
- [x] drag to create event
  - [ ] drag horizontally for multi-day event
- [ ] month view
- [x] mobile friendly
