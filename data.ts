import { AppData } from './types.ts';

export const INITIAL_APP_DATA: AppData = {
  "minerals": [
    {
      "id": "1",
      "name": "Amethyst Geode",
      "description": "A breathtaking geode from Uruguay, revealing a deep purple crystalline interior. Its majestic presence is a testament to nature's artistry, a treasure for any connoisseur.",
      "imageUrls": [
        "https://picsum.photos/seed/amethyst/800/600",
        "https://picsum.photos/seed/amethyst2/800/600"
      ],
      "type": "Quartz",
      "location": "Uruguay",
      "rarity": "Uncommon",
      "onDisplay": true
    },
    {
      "id": "2",
      "name": "Rhodochrosite",
      "description": "An exquisite specimen of Rhodochrosite from the Sweet Home Mine in Colorado. Known for its stunning raspberry-pink to rose-red color, it is one of the most sought-after minerals by collectors.",
      "imageUrls": [
        "https://picsum.photos/seed/rhodo/800/600"
      ],
      "type": "Calcite",
      "location": "Colorado, USA",
      "rarity": "Very Rare",
      "onDisplay": true
    },
    {
      "id": "3",
      "name": "Burmese Tourmaline",
      "description": "A gem-quality Tourmaline crystal from Myanmar, displaying a vibrant spectrum of colors. This piece embodies the pinnacle of mineralogical perfection and aesthetic allure.",
      "imageUrls": [
        "https://picsum.photos/seed/tourmaline/800/600"
      ],
      "type": "Tourmaline",
      "location": "Myanmar",
      "rarity": "Exceptional",
      "onDisplay": true
    },
    {
      "id": "4",
      "name": "Aquamarine on Muscovite",
      "description": "A perfectly terminated, sky-blue Aquamarine crystal stands in stark contrast to its sparkling Muscovite matrix. Sourced from the high peaks of Pakistan, this specimen is a poem written in stone.",
      "imageUrls": [
        "https://picsum.photos/seed/aquamarine/800/600",
        "https://picsum.photos/seed/aqua2/800/600",
        "https://picsum.photos/seed/aqua3/800/600"
      ],
      "type": "Beryl",
      "location": "Pakistan",
      "rarity": "Rare",
      "onDisplay": true
    },
    {
      "id": "5",
      "name": "Pyrite Sun",
      "description": "A unique formation of Pyrite, radiating from a central point like a golden sun. These fascinating discs are found in coal mines in Illinois, a brilliant anomaly of the mineral kingdom.",
      "imageUrls": [
        "https://picsum.photos/seed/pyrite/800/600"
      ],
      "type": "Pyrite",
      "location": "Illinois, USA",
      "rarity": "Rare",
      "onDisplay": false
    },
    {
      "id": "6",
      "name": "Optical Calcite",
      "description": "A crystal-clear rhomb of Optical Calcite, also known as Iceland Spar. Its remarkable property of double refraction has fascinated scientists and mystics for centuries. A piece of pure clarity.",
      "imageUrls": [
        "https://picsum.photos/seed/calcite/800/600"
      ],
      "type": "Calcite",
      "location": "Mexico",
      "rarity": "Common",
      "onDisplay": false
    }
  ],
  "homePageLayout": [
    {
      "id": "h1",
      "type": "hero",
      "mineralIds": [
        "1"
      ],
      "animation": {
        "type": "zoom-in",
        "duration": "15s"
      }
    },
    {
      "id": "g1",
      "type": "grid-2",
      "mineralIds": [
        "2",
        "4"
      ]
    }
  ],
  "layoutHistory": []
};
