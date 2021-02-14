# [1.16.0](https://github.com/mytlogos/enterprise-lister/compare/v1.15.0...v1.16.0) (2021-02-14)


### Bug Fixes

* **server:** fix optional parameter not supplied ([2c6010f](https://github.com/mytlogos/enterprise-lister/commit/2c6010f4c739b3bef2d1b8a4c8545ffc30bf9575))
* **server:** fix top level domain ([7084301](https://github.com/mytlogos/enterprise-lister/commit/70843018302ed7c0c46f77fbf04bd0f6b26d7db8))
* **website:** fix toggle-buttons usage ([b4f9ede](https://github.com/mytlogos/enterprise-lister/commit/b4f9ede21775c9ac0b68e8f457b92d6191f7a379))


### Features

* **scraper:** uniform links ([953255f](https://github.com/mytlogos/enterprise-lister/commit/953255fca15f24ca39712baefc57b3a8ae78e3a8))
* **website:** expand usage of store ([3595301](https://github.com/mytlogos/enterprise-lister/commit/3595301c1d39321d17a72b2addb2058a08447f93))
* **website:** expand usage of vuex store ([7c0355c](https://github.com/mytlogos/enterprise-lister/commit/7c0355c8f894a5c970ede72ffac540ae0e4d516b))
* **website:** filter releases by media type ([f0fdce0](https://github.com/mytlogos/enterprise-lister/commit/f0fdce05d849f43dbd5a26807e8350ccf07d824f))
* **website:** use strict typescript ([038037c](https://github.com/mytlogos/enterprise-lister/commit/038037cb6c3baa12de392cee2a50606e9e5e5e00))
* **website:** use vuex store for state managment ([471a377](https://github.com/mytlogos/enterprise-lister/commit/471a3778749eba5dd1eaf37a329fc960fc2eca40))

# [1.15.0](https://github.com/mytlogos/enterprise-lister/compare/v1.14.0...v1.15.0) (2020-12-06)


### Bug Fixes

* **scraper:** fix openlibrary search ([036e71c](https://github.com/mytlogos/enterprise-lister/commit/036e71c18933264aee927bf165bac3d08e9d2750))
* **scraper:** ignore empty search item ([67e619a](https://github.com/mytlogos/enterprise-lister/commit/67e619a5c78572eff93bd2ca8aad9b1464c83b29))
* **searchview:** replace static mediatype with selected ([11f7ff7](https://github.com/mytlogos/enterprise-lister/commit/11f7ff7636452cbf9e27c606ae56eaf668585eb3))
* ignore failed searches ([70385ef](https://github.com/mytlogos/enterprise-lister/commit/70385ef29a20ed189436b1ff492ef068e9928532))


### Features

* **searchview:** add search view for adding new media ([a6b5830](https://github.com/mytlogos/enterprise-lister/commit/a6b58303985425843ba568cf68e02a0719fd5aea))
* **searchview:** allow user to specify the media type to search for ([644acc6](https://github.com/mytlogos/enterprise-lister/commit/644acc67d688735f5e1ee3ea7a0c4eed4208a3fc))

# [1.14.0](https://github.com/mytlogos/enterprise-lister/compare/v1.13.0...v1.14.0) (2020-12-02)


### Features

* **scraper:** add open library hook ([2be467f](https://github.com/mytlogos/enterprise-lister/commit/2be467f01fc951220910351a57da51ed2d622a47))

# [1.13.0](https://github.com/mytlogos/enterprise-lister/compare/v1.12.0...v1.13.0) (2020-12-02)


### Bug Fixes

* fix linter (indent) errors ([6f0563d](https://github.com/mytlogos/enterprise-lister/commit/6f0563d3586df440e7ce942a4e63f708f23cc88a))


### Features

* **logger:** use daily log rotate for combined level transport ([a6b6ecc](https://github.com/mytlogos/enterprise-lister/commit/a6b6ecc87216dba8c4aff821d6eb7f9be9fc5abd))

# [1.12.0](https://github.com/mytlogos/enterprise-lister/compare/v1.11.0...v1.12.0) (2020-11-30)


### Bug Fixes

* **logger:** remove useless and misleading "zippedArchive" attribute ([b7fc122](https://github.com/mytlogos/enterprise-lister/commit/b7fc122e1e50c74abe3df86a226ca15a1684e1ec))
* **scraper:** enforce uniform toc links ([c23b8fc](https://github.com/mytlogos/enterprise-lister/commit/c23b8fc12075d348401ca44b4459e3284bde1921))
* **scraper:** fix attribute name not matching expected name ([7d08a40](https://github.com/mytlogos/enterprise-lister/commit/7d08a4086e66caf051417952945f220e703f2fab))
* **scraper:** fix link regex ([4fcc8cc](https://github.com/mytlogos/enterprise-lister/commit/4fcc8cc3158b269522a22faea9939b7d888c0f7f))
* **scraper:** fix scraper emitting wrong toc link ([e08091a](https://github.com/mytlogos/enterprise-lister/commit/e08091a2131d05264cc1df6c9c0d5bf694fdbbdb))
* **scraper:** fix sql query ([7dc296b](https://github.com/mytlogos/enterprise-lister/commit/7dc296bb7ab68e5de1ef065f3ecece89e6b90593))


### Features

* **scraper:** estimate closest possible release date time ([b1dd4f9](https://github.com/mytlogos/enterprise-lister/commit/b1dd4f94d5001ee2283f872ab75d3902d277cdf0))

# [1.11.0](https://github.com/mytlogos/enterprise-lister/compare/v1.10.0...v1.11.0) (2020-11-24)


### Bug Fixes

* **jobstatistic:** normalize grouped domain values as well ([a5e1fb5](https://github.com/mytlogos/enterprise-lister/commit/a5e1fb5d6145c7290daa21464be05d394aa383c1))
* add missing file ([b5df50a](https://github.com/mytlogos/enterprise-lister/commit/b5df50a02813cc75ad6c382f9529f3ae49d98f7f))
* **jobstatistic:** fix disallow single property on multiple axis ([5e1bb32](https://github.com/mytlogos/enterprise-lister/commit/5e1bb32aa2cf236d8bb1ce3d681a13f98d86219f))
* **jobstatistic:** skip properties which are not a average value ([12f5b49](https://github.com/mytlogos/enterprise-lister/commit/12f5b49e848acad9db6dfce9a32e80e45903e08e))


### Features

* **jobstatistic:** add chart coloring ([61b2a73](https://github.com/mytlogos/enterprise-lister/commit/61b2a735ec9ba8442c2b9b207231a8f4c52c246a))
* **jobstatistic:** add feature go add datasets grouped by domain ([76b90a3](https://github.com/mytlogos/enterprise-lister/commit/76b90a3ef1a1beda73b837a7d9753a7d3e33f30d))
* **jobstatistic:** add from and to datetime range ([c978766](https://github.com/mytlogos/enterprise-lister/commit/c978766bd3d97892f87be71d33e7a6815952520a))
* **jobstatistic:** add more labelling ([8f574ef](https://github.com/mytlogos/enterprise-lister/commit/8f574ef3705e49a498cfb3dd4bd8403fca3c3541))
* **jobstatistic:** add refresh button ([0043250](https://github.com/mytlogos/enterprise-lister/commit/00432505bb24029659c33d2d0d85ce7f3aac9a74))
* **jobstatistic:** add table accessibility caption ([38c0bf9](https://github.com/mytlogos/enterprise-lister/commit/38c0bf916327263e4f1b3ada56880c21bf342987))
* **jobstatistic:** allow different properties to be used on the left y axis ([4ae9b7f](https://github.com/mytlogos/enterprise-lister/commit/4ae9b7f6a86f7c081688a8add00651091c675cb2))
* **jobstatistic:** allow more attributes to be displayed ([99eb46b](https://github.com/mytlogos/enterprise-lister/commit/99eb46b690a8f444e81e5b7f092cd9793a29a4fa))
* **jobstatistic:** allow user to choose time grouping ([cd81a69](https://github.com/mytlogos/enterprise-lister/commit/cd81a698074a3219ba53badea17042c00e9df9fc))
* **jobstatistic:** display data in table ([0178dcf](https://github.com/mytlogos/enterprise-lister/commit/0178dcfe1446bbfd6a2bb48107e89deac445990b))
* **jobstatistic:** enable user to select what property to display on the right axis ([0f6b502](https://github.com/mytlogos/enterprise-lister/commit/0f6b50211d8c0a0ccbf711cdd0795140dc13da2b))
* **jobstatistic:** remember current config selection ([dcd5139](https://github.com/mytlogos/enterprise-lister/commit/dcd51394820edbb4922378af2f5d8bc602904f85))
* **jobsviews:** add initial general jobs statistics ([a2a0acb](https://github.com/mytlogos/enterprise-lister/commit/a2a0acb2589a61f1fff3da179e1472b17bfb4751))
* **releases:** add refresh button ([5a3d651](https://github.com/mytlogos/enterprise-lister/commit/5a3d65107c59282a5c1299d3f8f2cb3a9a939bc3))

# [1.10.0](https://github.com/mytlogos/enterprise-lister/compare/v1.9.0...v1.10.0) (2020-11-18)


### Bug Fixes

* add missing placeholder value ([bc27b2f](https://github.com/mytlogos/enterprise-lister/commit/bc27b2fdd144aa3109279a3abad4364dfc5f0bf4))
* fix referenced rows not deleted ([a2b9c67](https://github.com/mytlogos/enterprise-lister/commit/a2b9c67b7ba3d0bd76444c4d0b5b15986f270327))
* **storage:** await pool.end ([ed0e3c7](https://github.com/mytlogos/enterprise-lister/commit/ed0e3c732879fd6b05c7d3b32cf66d82f1f863f1))
* **storage:** fix query ([4eb01b7](https://github.com/mytlogos/enterprise-lister/commit/4eb01b7b9fcf6c468e523ebaa97850013127fba2))
* prevent possible pishing from opening external websites ([94812dd](https://github.com/mytlogos/enterprise-lister/commit/94812dd580a9dcc737441ebad01ebd52ddd4f972))
* **views:** uniform datetime representation ([c851bde](https://github.com/mytlogos/enterprise-lister/commit/c851bde9c2cf2857282cdc79ff53f7c820601419))


### Features

* refactor queryInList for better readability and flexibility ([cfaeb14](https://github.com/mytlogos/enterprise-lister/commit/cfaeb147e44dbe8568f42c12b33cf7e192851f51))
* **jobsview:** add sort order on table ([9c141f5](https://github.com/mytlogos/enterprise-lister/commit/9c141f556136ce38fd162ae5c69b1d1d29a59f69))
* **jobsview:** display more stats about jobs ([1323e28](https://github.com/mytlogos/enterprise-lister/commit/1323e28e9415a825b092a60632d036e14b392522))
* **jobsview:** display overall stats ([21e8288](https://github.com/mytlogos/enterprise-lister/commit/21e82885478162ab8751fcb6a342e034eadc8685))
* **jobsviews:** add JobsDetail view, enhance JobsView ([af16923](https://github.com/mytlogos/enterprise-lister/commit/af1692369ccba735dfb5332af01f710cab0fcd99))


### Performance Improvements

* optimize release update ([8952d2d](https://github.com/mytlogos/enterprise-lister/commit/8952d2d18783f63f07ed636f94e7003e74c719de))
* reduce number of sql queries ([92cd66c](https://github.com/mytlogos/enterprise-lister/commit/92cd66c1f46532c28128f2750508dead59c3cbe9))

# [1.9.0](https://github.com/mytlogos/enterprise-lister/compare/v1.8.0...v1.9.0) (2020-11-14)


### Bug Fixes

* **scraper:** emit uniform links only ([c8df395](https://github.com/mytlogos/enterprise-lister/commit/c8df395738b6c1d7e7ae73f148a5fe019b4824d1))


### Features

* track toc of release ([6300428](https://github.com/mytlogos/enterprise-lister/commit/63004284332571356ef4ea7cfbefa523bf78e512))

# [1.8.0](https://github.com/mytlogos/enterprise-lister/compare/v1.7.0...v1.8.0) (2020-11-14)


### Bug Fixes

* fix AsyncResource.bind arguments ([e23ec76](https://github.com/mytlogos/enterprise-lister/commit/e23ec762736fe5765537a044ff026644c3827896))
* fix imports ([b1be4d0](https://github.com/mytlogos/enterprise-lister/commit/b1be4d099bd690a62b3b9025ba91e9f31e6ac5d3))
* **scraper:** fix property access on undefined ([439214f](https://github.com/mytlogos/enterprise-lister/commit/439214fa809fbb15be5b480d91f201b9c244d8f5))
* **scraper:** fix tocs not updated ([2f8fc0b](https://github.com/mytlogos/enterprise-lister/commit/2f8fc0bb5b45a3e8986cf5ed2581cb350d34ff2c))
* **scraper:** ignore some errors or unimportant informations which would fail the whole job ([150d141](https://github.com/mytlogos/enterprise-lister/commit/150d141dbd42e9f1d0893197e079a50e9edcf711))
* **scraper:** retry request on internal server error ([ee08159](https://github.com/mytlogos/enterprise-lister/commit/ee0815977279114318ce99443d93776f46f87885))
* **scraper:** retry when part of the response is missing ([5e2fc85](https://github.com/mytlogos/enterprise-lister/commit/5e2fc8507764af2ac62b749d96220c200a153a6b))


### Features

* **scraper:** scrape authors and artists when possible ([70faf6c](https://github.com/mytlogos/enterprise-lister/commit/70faf6c852745a26b135c452c19e39f71ca28d04))
* **scraper:** store jobs result state, message and context in database ([7c86b05](https://github.com/mytlogos/enterprise-lister/commit/7c86b05d5d134ca7e10595d9ab560f3e51677e43))
* **scraper:** store more modifications, store query count ([70df3c4](https://github.com/mytlogos/enterprise-lister/commit/70df3c45fd13cd267c9c4aed6c7b5e8059ffd198))
* **scraper:** track network ([9d6d664](https://github.com/mytlogos/enterprise-lister/commit/9d6d664536fe657c55bad5958cf16372ced4b822))

# [1.7.0](https://github.com/mytlogos/enterprise-lister/compare/v1.6.0...v1.7.0) (2020-11-07)


### Bug Fixes

* **mediumdetailsview:** fix toast block mouse events on last toc row ([3b45bc7](https://github.com/mytlogos/enterprise-lister/commit/3b45bc7e171cd3239db45ceded5b89f262c4dc2b))
* **router:** fix incorrect props type warning ([5257f4e](https://github.com/mytlogos/enterprise-lister/commit/5257f4e747553f5f82f04c371b881f4dd403428e))


### Features

* **mediaview:** display progress, merge medium with tocs details ([5be74fc](https://github.com/mytlogos/enterprise-lister/commit/5be74fcfd815cab05fd2cd4a8a727973fdc92340))
* **mediumdetailsview:** add mark all button with result toast ([8a3e540](https://github.com/mytlogos/enterprise-lister/commit/8a3e540b947f41170494c09296c3f94876eb094a))
* **mediumdetailsview:** display tocs of a medium ([26b83c1](https://github.com/mytlogos/enterprise-lister/commit/26b83c1064bfb0b615cd9c56708c8f7aa8a4afe3))
* **mediumdetailsview:** merge tocs into display details ([283cf5e](https://github.com/mytlogos/enterprise-lister/commit/283cf5e1e41446593ea7f0e84f3ce6e9d3aba111))

# [1.6.0](https://github.com/mytlogos/enterprise-lister/compare/v1.5.0...v1.6.0) (2020-11-06)


### Bug Fixes

* **jobsview:** fix jobs sort order by enforcing null value on runningSince for waiting jobs ([7a7ac7c](https://github.com/mytlogos/enterprise-lister/commit/7a7ac7cf71575e3035dd3ea40f4a5246fcc0c9f8))


### Features

* **jobsview:** add primitive summary of jobs ([f7bed31](https://github.com/mytlogos/enterprise-lister/commit/f7bed31119fb29cbaac500e3bcda8ea3738f4333))

# [1.5.0](https://github.com/mytlogos/enterprise-lister/compare/v1.4.0...v1.5.0) (2020-11-05)


### Bug Fixes

* **scraper:** fix link regex ([0d961bb](https://github.com/mytlogos/enterprise-lister/commit/0d961bb1506f7f9783062bb66dfe554383213475))


### Features

* **addmedium:** do not autohide toast and show it above button ([2ffa63b](https://github.com/mytlogos/enterprise-lister/commit/2ffa63b71465bbc8f4de528a6db72bdff92b9237))

# [1.4.0](https://github.com/mytlogos/enterprise-lister/compare/v1.3.0...v1.4.0) (2020-11-04)


### Features

* **addmedium:** rewrite AddMedium View, load data from toc link ([ee5c719](https://github.com/mytlogos/enterprise-lister/commit/ee5c71957d0f220a335e45f8ade6a9f6c4a9bf13))

# [1.3.0](https://github.com/mytlogos/enterprise-lister/compare/v1.2.0...v1.3.0) (2020-11-02)


### Bug Fixes

* **asyncstorage:** fix return type of callback ([f104655](https://github.com/mytlogos/enterprise-lister/commit/f10465510eaa15a9748ae0e1d6996c593a8195cb))
* **database:** fix pool providing, switching ([fc57efc](https://github.com/mytlogos/enterprise-lister/commit/fc57efc39fbdb7c19b2c84035d828b53bb099a69))
* **jobs:** reduce number of max active jobs ([c526b55](https://github.com/mytlogos/enterprise-lister/commit/c526b5597fee891668bc60c3d94fb13717b3c640))
* **jobsview:** add scope to table header ([becaf7c](https://github.com/mytlogos/enterprise-lister/commit/becaf7ccaf5df68bab1bc5be5803083493687024))
* **mediumcontext:** disambiguate columns in query ([28831aa](https://github.com/mytlogos/enterprise-lister/commit/28831aacf4d73c66ecf264d0a2a90a17b7dbb319))


### Features

* **admin:** add Administration and Jobs View ([49bd878](https://github.com/mytlogos/enterprise-lister/commit/49bd878abcff38454c2700e82e4d75c0111b71dc))
* **jobs:** track detailed job contexts and history ([fd7a37d](https://github.com/mytlogos/enterprise-lister/commit/fd7a37d687ba5bf9ff2195afcac9960820368ff5))
* **jobsview:** add screen reader caption to table ([7d6db22](https://github.com/mytlogos/enterprise-lister/commit/7d6db221ee7e37dde8d1892b1a3486129f2dc383))
* **storage:** add database pool provider ([65842e9](https://github.com/mytlogos/enterprise-lister/commit/65842e9d17bdd284668aebb3b4bc0ef35c572bdf))

# [1.2.0](https://github.com/mytlogos/enterprise-lister/compare/v1.1.0...v1.2.0) (2020-10-22)


### Bug Fixes

* fix build and remove some dead code ([5981e1d](https://github.com/mytlogos/enterprise-lister/commit/5981e1d97c5e568dda7395691e96e2a53cb1a302))
* **media:** fix vue type warnings when prop is undefined or null ([a696967](https://github.com/mytlogos/enterprise-lister/commit/a6969672234aea4af2e3384ff3009456a508df18))


### Features

* **media:** add state of country, state of tl views and state of tl filter ([c473cf4](https://github.com/mytlogos/enterprise-lister/commit/c473cf43a895ddd901d9a820eaea095abbc9fad1))
* **media:** replace mediumType text with icon ([0869a7e](https://github.com/mytlogos/enterprise-lister/commit/0869a7e9af12a11cdd629f136ff46b676220509c))
* **media:** sort Media alphabetically by title ([2be6be3](https://github.com/mytlogos/enterprise-lister/commit/2be6be31f243db06beb5461509879ba9bb58eb4c))
* **mediumdetail:** add content to mediumDetail ([f09acba](https://github.com/mytlogos/enterprise-lister/commit/f09acba0be4902f96f1b80950fb7caf58dda317c))

# [1.1.0](https://github.com/mytlogos/enterprise-lister/compare/v1.0.1...v1.1.0) (2020-10-19)


### Features

* automatic Deploy with Jenkins ([78881c7](https://github.com/mytlogos/enterprise-lister/commit/78881c7c3e9290b35673097d1586852816d9176b)), closes [#30](https://github.com/mytlogos/enterprise-lister/issues/30)

## [1.0.1](https://github.com/mytlogos/enterprise-lister/compare/v1.0.0...v1.0.1) (2020-10-18)


### Bug Fixes

* address sonarlint issues ([12cc380](https://github.com/mytlogos/enterprise-lister/commit/12cc38012556aa1ebd2b12e8b742057ed74c9770))
* fix sonarlint bugs ([a7b3d4a](https://github.com/mytlogos/enterprise-lister/commit/a7b3d4a64c7e5365418516a87eecbaa60ebd323f))
