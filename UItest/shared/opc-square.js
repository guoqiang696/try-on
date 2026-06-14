/**
 * OPC 智能试衣 — 广场社交
 * 浏览、点赞、评论、收藏、保存模特、发布、复用风格
 */
(function () {
  'use strict';

  const POSTS_KEY = 'opc-square-posts';
  const LIKED_KEY = 'opc-square-liked';
  const SAVED_KEY = 'opc-square-saved';
  const SHARED_KEY = 'opc-gallery-shared';
  const MODEL_KEY = 'opc-model-library';
  const REMIX_KEY = 'opc-square-remix';
  const MODEL_SAVED_KEY = 'opc-square-model-saved';

  const TYPE_LABELS = { model: '模特', tryon: '试衣图', collection: '搭配合集' };

  const FILTER_CHIPS = ['通勤', '韩系', '街头', '高定', '运动', '男装', '女装', '可保存模特', '可复用风格'];

  const AVATAR =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCNUXM2QU3agFgGeDBRPWSvW8GG6ppZe-_t13eB3SY6ejalmmZ5ulj5K50GWSafXKEB08eTgEk4pMrLmDy0ESNLaUXhP2CDM_kNKcAuQb_y_8iE9q9adIEV8KVBfJjIaNbEznKDqNOODzoqQI58lu2Sd-KgIBS1t4mhZTeY63Bv9ka8HtdSPUys_361zs2TD9LOUH0oZBCRR-iGxExwJLTa9hUUH0ip0qgMrv_NDAlo6_W7M59vjXp3CCrWJ-gaMyxwsoeCkvYCFtT-';

  const DEFAULT_POSTS = [
    {
      id: 'sq-1',
      author: { id: 'u1', name: '穿搭达人小雅', avatar: AVATAR, badge: '穿搭达人' },
      type: 'model',
      title: '通勤风虚拟模特 · 林娅同款',
      description: '适合职场通勤的 AI 模特，身形比例自然，可直接用于试衣。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6pFLFdiilaCjJ0L7hleEDEezJ_DnTkX_Blso6vgkNVHohbEKvLWim9Rz_5R4bthEWoDrEo38ixHDgESj31dV6AxVwqo0i_vU7pt06kN3BoNFYqP_bNWWFX8tocYfeXsOR20IQ4hfOXgMyjpvI7yyyfIxsjGNWrYs1nGTonY-FRbyKEJNOsAyhQSDT7_Hp5r4tkFu48rovC9qL2WB4My-uFbNnBtNvPQp6r3yzqEDvt8J6BQIrDwoTAsj3gXnPnwoDAuD6P7m3isr9',
      model: { name: '林娅', height: 175, src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6pFLFdiilaCjJ0L7hleEDEezJ_DnTkX_Blso6vgkNVHohbEKvLWim9Rz_5R4bthEWoDrEo38ixHDgESj31dV6AxVwqo0i_vU7pt06kN3BoNFYqP_bNWWFX8tocYfeXsOR20IQ4hfOXgMyjpvI7yyyfIxsjGNWrYs1nGTonY-FRbyKEJNOsAyhQSDT7_Hp5r4tkFu48rovC9qL2WB4My-uFbNnBtNvPQp6r3yzqEDvt8J6BQIrDwoTAsj3gXnPnwoDAuD6P7m3isr9', gender: '女' },
      tags: ['通勤', '女装', '模特'],
      likes: 128, comments: [], saves: 45, allowSaveModel: true, allowRemix: true,
      stylePrompt: '职场通勤风，简约干练，自然光线',
      createdAt: '2026-06-10T08:00:00Z',
    },
    {
      id: 'sq-2',
      author: { id: 'u2', name: '街头男孩阿Ken', avatar: AVATAR, badge: '潮流博主' },
      type: 'model',
      title: '街头风男模 · 陈伟造型',
      description: '高个子街头风男模，适合潮牌、运动系列试衣。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTSjyrX0R7GH-ilVa-dfo80eEh32kzCUwvi_v08SwhJTzuhZ1FuYZAZFKQuToF1s_HAxKZs4DUxmviZQ4zh2-hBrm0eQujfEJgs0E_Eqjc7tWOQw8cpPT1VvJY_Y3BbZy6DG_oPQ6Sa6a8lvOlYQSZeGn4nwroYYvWkyyHF_u6gCMFVYVvdJa28KS1JQB-Fc0l993IGNKhM1rLSEuiOm8QepbX_k92twwEPTtp0aI2lCXJr1Qn2ETaqhpTfCvcZAPtjOUeNfrmi7rB',
      model: { name: '陈伟', height: 185, src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTSjyrX0R7GH-ilVa-dfo80eEh32kzCUwvi_v08SwhJTzuhZ1FuYZAZFKQuToF1s_HAxKZs4DUxmviZQ4zh2-hBrm0eQujfEJgs0E_Eqjc7tWOQw8cpPT1VvJY_Y3BbZy6DG_oPQ6Sa6a8lvOlYQSZeGn4nwroYYvWkyyHF_u6gCMFVYVvdJa28KS1JQB-Fc0l993IGNKhM1rLSEuiOm8QepbX_k92twwEPTtp0aI2lCXJr1Qn2ETaqhpTfCvcZAPtjOUeNfrmi7rB', gender: '男' },
      tags: ['街头', '男装', '运动'],
      likes: 96, comments: [{ id: 'c1', user: '时尚小白', avatar: AVATAR, text: '这个模特很适合街头风', time: '2天前' }],
      saves: 32, allowSaveModel: true, allowRemix: true,
      stylePrompt: '街头潮流，宽松版型，都市背景',
      createdAt: '2026-06-09T14:00:00Z',
    },
    {
      id: 'sq-3',
      author: { id: 'u3', name: '品牌主理人Luna', avatar: AVATAR, badge: '品牌主理人' },
      type: 'model',
      title: '优雅系女模 · 小雪',
      description: '适合高定、晚装系列的优雅女模形象。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqlRz4zEnk4gE1xTXOqB9bUIedw_jsGymcyLc6J-pH7tpEOdFIrxxCZMABt7dhzhUECSfGvUD0pAqSA5dBxy3jF3tAe45UGGAd3ZF9QsMOyE69UsTmvmdM3SGvWxyi2bMHhMDEeB-iZJ-PxqMhCkuP1ID7f_ZoZFSJb0MVjhFZn6sdANDVdbc7_24vS6M83PDkSk-c-26-33wfILvh8HwpsUen35z7NH0FQfrTPYqU7214sfJJLf7wutXOBBd23tvewp-vjKOaDqQz',
      model: { name: '小雪', height: 170, src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqlRz4zEnk4gE1xTXOqB9bUIedw_jsGymcyLc6J-pH7tpEOdFIrxxCZMABt7dhzhUECSfGvUD0pAqSA5dBxy3jF3tAe45UGGAd3ZF9QsMOyE69UsTmvmdM3SGvWxyi2bMHhMDEeB-iZJ-PxqMhCkuP1ID7f_ZoZFSJb0MVjhFZn6sdANDVdbc7_24vS6M83PDkSk-c-26-33wfILvh8HwpsUen35z7NH0FQfrTPYqU7214sfJJLf7wutXOBBd23tvewp-vjKOaDqQz', gender: '女' },
      tags: ['高定', '女装', '优雅'],
      likes: 210, comments: [], saves: 78, allowSaveModel: true, allowRemix: false,
      stylePrompt: '高定优雅，影棚灯光，精致细节',
      createdAt: '2026-06-08T10:00:00Z',
    },
    {
      id: 'sq-4',
      author: { id: 'u4', name: 'Summer试衣间', avatar: AVATAR },
      type: 'tryon',
      title: '夏日通勤白裙试衣效果',
      description: '林娅模特 + 白色连衣裙，影棚自然光，通勤必备。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVof0tdfpgZDW7gpB7FDkcCHhvmFaJgMeycPS_D1hqQA4PUAWOE78RZMeyiR4C-ehcbaRVn7AHyZub-KzAmfky2V2T_hSsf3TBc7MzC7V5rO0AwHHpWA4wE4ou44Lfp8hT69bkq44diPVdB1XbB7uxm0FYDHXzAq5TFJW4xB-3WQAIyeNSpiRsA3YX2-6wxQCY0G2gWeqMeyvL8SMdZi5GrWfzoeTqVgkTlfn2KKWS6KC1yhwvroUULAD8WbU0OTJBEsyrzsp8Jp7K',
      model: { name: '林娅', height: 175, src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6pFLFdiilaCjJ0L7hleEDEezJ_DnTkX_Blso6vgkNVHohbEKvLWim9Rz_5R4bthEWoDrEo38ixHDgESj31dV6AxVwqo0i_vU7pt06kN3BoNFYqP_bNWWFX8tocYfeXsOR20IQ4hfOXgMyjpvI7yyyfIxsjGNWrYs1nGTonY-FRbyKEJNOsAyhQSDT7_Hp5r4tkFu48rovC9qL2WB4My-uFbNnBtNvPQp6r3yzqEDvt8J6BQIrDwoTAsj3gXnPnwoDAuD6P7m3isr9', gender: '女' },
      garmentName: '白色通勤连衣裙',
      tags: ['通勤', '女装', '试衣图'],
      likes: 342, comments: [{ id: 'c2', user: '小美', avatar: AVATAR, text: '配色很高级', time: '1天前' }, { id: 'c3', user: '阿杰', avatar: AVATAR, text: '想看同款男装效果', time: '3小时前' }],
      saves: 156, allowSaveModel: true, allowRemix: true,
      stylePrompt: '夏日通勤，白色连衣裙，自然影棚光，清新简约',
      createdAt: '2026-06-11T06:00:00Z',
    },
    {
      id: 'sq-5',
      author: { id: 'u5', name: '都市穿搭师', avatar: AVATAR, badge: '穿搭达人' },
      type: 'tryon',
      title: '都市休闲上装试穿',
      description: '真人试衣模式生成的都市休闲效果，版型自然。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApL9y2vTESD99DHU3WQq-NMtDNmwGX-pvLkYiajxJTrz65FBMHqKQN_jB_pRtf0hfhxtUuI6EQEt3R8_cDhucrEYJIRLnXH-yzDPFYBjB2PyH-rcYfzif_4-NiS7IxkGmeKOtERfQySRIMr_CUmqNN4H-si21nc5Ij5blNSHUujV9JhkzpN5I4s495YYP41DYigch5Ay1DlhvS26tZ45PG2Fx4RCURhypzDnVWZnpip1YyWd7JAZK4gbgTw92C4MC0QS5DeRBJsfv6',
      tags: ['街头', '休闲', '试衣图'],
      likes: 187, comments: [], saves: 67, allowSaveModel: false, allowRemix: true,
      stylePrompt: '都市街头休闲，宽松上装，自然光户外',
      createdAt: '2026-06-07T16:00:00Z',
    },
    {
      id: 'sq-6',
      author: { id: 'u6', name: 'AI造型实验室', avatar: AVATAR },
      type: 'tryon',
      title: '韩系简约风试衣',
      description: '自由风格生成，韩系简约配色，适合日常穿搭参考。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7CRBP2qhtnFGo84JR-h1y8ucsf0KXXcekOx1waO3-wEmyywoA6_S6WQSznjWFcPkAj765eg_FAlNt6VY_hZ4IGpPzQiw2-4j4GXcKKNhw3pEmgpHyTdldRplt2M0tSnF4t_K2-oRNRutlksBAXOgj1UHYTTMlppT1UyARaxR6frrIjl2W7W6NUyPCbPpMNdHEmbS_glkrlHTOA_b7P9ezW9YM-wl0XYV7z8Ldf8DjQ8HLLoQu7RTfLHvBjJJP3KNOUqB9xO4N1GBH',
      tags: ['韩系', '女装', '极简'],
      likes: 256, comments: [{ id: 'c4', user: '韩风爱好者', avatar: AVATAR, text: '可以试试更宽松的版型', time: '5小时前' }],
      saves: 89, allowSaveModel: false, allowRemix: true,
      stylePrompt: '韩系简约，低饱和配色，干净背景，松弛感',
      createdAt: '2026-06-06T12:00:00Z',
    },
    {
      id: 'sq-7',
      author: { id: 'u7', name: '户外机能控', avatar: AVATAR },
      type: 'collection',
      title: '户外机能穿搭合集',
      description: '3 套户外机能风搭配，黄色防水夹克 + 徒步靴组合。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByFjF31gvcX40FRfit0xrwukKH32xgyUUyGQs_zLEwatleO_vRHECIBjK8Jv1YvaS5FKn8F_IBE_h1JQwzL82hf2dzfXQJL0m03yq8ikH20rCe5BuHp-vuEp7hX-Hi1m6um7-hmcKs28A-DGQwpXdueBMm70ZCFCvDT8txkSOOgG84ww9PY4ce1y6TRK8xeB91UJsQ1DPYdnRzST5mbprobrSyu-MzjOLpE3nuOizfNcN0INE_5WSHTMK3AW_WyTxiikSqrysYI65h',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuByFjF31gvcX40FRfit0xrwukKH32xgyUUyGQs_zLEwatleO_vRHECIBjK8Jv1YvaS5FKn8F_IBE_h1JQwzL82hf2dzfXQJL0m03yq8ikH20rCe5BuHp-vuEp7hX-Hi1m6um7-hmcKs28A-DGQwpXdueBMm70ZCFCvDT8txkSOOgG84ww9PY4ce1y6TRK8xeB91UJsQ1DPYdnRzST5mbprobrSyu-MzjOLpE3nuOizfNcN0INE_5WSHTMK3AW_WyTxiikSqrysYI65h',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBvcXLJCAw_JX04JIAPbStZuvVBNnlHHA0QLbs6lvFZG_dnTgI3i3w1eAllci3RrQo6GjRmcr2q-g-0MUp5CQersblccP0Iy_m1V5askSXzH1bsfZ3FfYXqPuEZEfZ90qK_boxVyKHNf7ZZgHvfi6nDDPLwI50swucnSbkf0TlPF3gw2dfg1XAD0AtXFMZdZkqImZWLOr5v7T8nFznOLfApT6AgRvBmZCG8sSw-gOrxYoQxZVGe3Cwc8RRnyYq-sDpVjvISRy7bInA8',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCgNAIIEWpIi67nYxFbpivtr4MgV-AXre2ENgE0kmUFcBOAxm8-QLb7iVRJmrLYYS5Hh9GMatQHfWVM0iEfudd9wcVwVvIK65uukqGTPcfLubI6N_KATKbLcx1G3bnkfmlvNi9YcnFzhpB8nCQssWzM_pguykMBBTJ9nVMMhXoOgr8mjegY-rcMpdI1GaNKoKDg_Brm_lc4doAsFNKpQRp2zBObxb1iF07X1kNLPMba82H1udY2-TuZBuGsWAQrZFCowYcIIMzhzZhT',
      ],
      tags: ['户外', '运动', '机能'],
      likes: 178, comments: [], saves: 54, allowSaveModel: false, allowRemix: true,
      stylePrompt: '户外机能风，防水材质，明亮自然光',
      createdAt: '2026-06-05T09:00:00Z',
    },
    {
      id: 'sq-8',
      author: { id: 'u8', name: '晚装设计师', avatar: AVATAR, badge: '品牌主理人' },
      type: 'collection',
      title: '高定晚装搭配精选',
      description: '2 套高定晚装造型，适合宴会、红毯场景参考。',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdHhxsWkw4GnBoUS0BLl1-uSEVvIQ3z_lNwTA0IeVyJhD5W17ML6rjYloSodj3rpF0n2bkd3-UHqwIavJPdIHg5i6CcNaRxf1ucgjQk9HYKwV_gT8kLQLbUL0YNbVAUekPs0jae477lBWBY0ths4Dz83_gOJdAyYg18IsLIJMctxirZYxHV8Bwt6u2CsYJJD36HUZRhS5X4qrBQlWNVKbfIUDNbqYqF_IzEiieJxnDL1YtdLPkoi2FjX69BzrOiJhITicQ6xt5qHQa',
      images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDdHhxsWkw4GnBoUS0BLl1-uSEVvIQ3z_lNwTA0IeVyJhD5W17ML6rjYloSodj3rpF0n2bkd3-UHqwIavJPdIHg5i6CcNaRxf1ucgjQk9HYKwV_gT8kLQLbUL0YNbVAUekPs0jae477lBWBY0ths4Dz83_gOJdAyYg18IsLIJMctxirZYxHV8Bwt6u2CsYJJD36HUZRhS5X4qrBQlWNVKbfIUDNbqYqF_IzEiieJxnDL1YtdLPkoi2FjX69BzrOiJhITicQ6xt5qHQa',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDqlRz4zEnk4gE1xTXOqB9bUIedw_jsGymcyLc6J-pH7tpEOdFIrxxCZMABt7dhzhUECSfGvUD0pAqSA5dBxy3jF3tAe45UGGAd3ZF9QsMOyE69UsTmvmdM3SGvWxyi2bMHhMDEeB-iZJ-PxqMhCkuP1ID7f_ZoZFSJb0MVjhFZn6sdANDVdbc7_24vS6M83PDkSk-c-26-33wfILvh8HwpsUen35z7NH0FQfrTPYqU7214sfJJLf7wutXOBBd23tvewp-vjKOaDqQz',
      ],
      model: { name: '小雪', height: 170, src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqlRz4zEnk4gE1xTXOqB9bUIedw_jsGymcyLc6J-pH7tpEOdFIrxxCZMABt7dhzhUECSfGvUD0pAqSA5dBxy3jF3tAe45UGGAd3ZF9QsMOyE69UsTmvmdM3SGvWxyi2bMHhMDEeB-iZJ-PxqMhCkuP1ID7f_ZoZFSJb0MVjhFZn6sdANDVdbc7_24vS6M83PDkSk-c-26-33wfILvh8HwpsUen35z7NH0FQfrTPYqU7214sfJJLf7wutXOBBd23tvewp-vjKOaDqQz', gender: '女' },
      tags: ['高定', '女装', '晚装'],
      likes: 423, comments: [{ id: 'c5', user: '礼服控', avatar: AVATAR, text: '这个模特很适合通勤风', time: '6小时前' }],
      saves: 201, allowSaveModel: true, allowRemix: true,
      stylePrompt: '高定晚装，暗调灯光，奢华质感',
      createdAt: '2026-06-04T20:00:00Z',
    },
  ];

  const GALLERY_WORKS = {
    'work-1': { title: '夏季系列连衣裙', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVof0tdfpgZDW7gpB7FDkcCHhvmFaJgMeycPS_D1hqQA4PUAWOE78RZMeyiR4C-ehcbaRVn7AHyZub-KzAmfky2V2T_hSsf3TBc7MzC7V5rO0AwHHpWA4wE4ou44Lfp8hT69bkq44diPVdB1XbB7uxm0FYDHXzAq5TFJW4xB-3WQAIyeNSpiRsA3YX2-6wxQCY0G2gWeqMeyvL8SMdZi5GrWfzoeTqVgkTlfn2KKWS6KC1yhwvroUULAD8WbU0OTJBEsyrzsp8Jp7K', type: 'tryon', tags: ['夏季', '影棚灯光'], model: { name: '林娅', height: 175, src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6pFLFdiilaCjJ0L7hleEDEezJ_DnTkX_Blso6vgkNVHohbEKvLWim9Rz_5R4bthEWoDrEo38ixHDgESj31dV6AxVwqo0i_vU7pt06kN3BoNFYqP_bNWWFX8tocYfeXsOR20IQ4hfOXgMyjpvI7yyyfIxsjGNWrYs1nGTonY-FRbyKEJNOsAyhQSDT7_Hp5r4tkFu48rovC9qL2WB4My-uFbNnBtNvPQp6r3yzqEDvt8J6BQIrDwoTAsj3gXnPnwoDAuD6P7m3isr9', gender: '女' }, stylePrompt: '夏季连衣裙，影棚自然光' },
    'work-2': { title: '都市休闲上装', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApL9y2vTESD99DHU3WQq-NMtDNmwGX-pvLkYiajxJTrz65FBMHqKQN_jB_pRtf0hfhxtUuI6EQEt3R8_cDhucrEYJIRLnXH-yzDPFYBjB2PyH-rcYfzif_4-NiS7IxkGmeKOtERfQySRIMr_CUmqNN4H-si21nc5Ij5blNSHUujV9JhkzpN5I4s495YYP41DYigch5Ay1DlhvS26tZ45PG2Fx4RCURhypzDnVWZnpip1YyWd7JAZK4gbgTw92C4MC0QS5DeRBJsfv6', type: 'tryon', tags: ['休闲', '都市'], stylePrompt: '都市休闲，宽松上装' },
    'work-3': { title: '秋季系列探索 - 层次纹理', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgNAIIEWpIi67nYxFbpivtr4MgV-AXre2ENgE0kmUFcBOAxm8-QLb7iVRJmrLYYS5Hh9GMatQHfWVM0iEfudd9wcVwVvIK65uukqGTPcfLubI6N_KATKbLcx1G3bnkfmlvNi9YcnFzhpB8nCQssWzM_pguykMBBTJ9nVMMhXoOgr8mjegY-rcMpdI1GaNKoKDg_Brm_lc4doAsFNKpQRp2zBObxb1iF07X1kNLPMba82H1udY2-TuZBuGsWAQrZFCowYcIIMzhzZhT', type: 'tryon', tags: ['外套', '自由风格'], stylePrompt: '秋季层次穿搭，纹理丰富' },
  };

  let state = {
    tab: 'recommend',
    search: '',
    chip: '',
    publishTags: [],
  };

  let toastTimer = null;

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function lsSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  }

  function getPosts() {
    const stored = lsGet(POSTS_KEY, null);
    if (!stored || stored.length === 0) {
      lsSet(POSTS_KEY, DEFAULT_POSTS);
      return [...DEFAULT_POSTS];
    }
    return stored;
  }

  function savePosts(posts) {
    lsSet(POSTS_KEY, posts);
  }

  function getPost(id) {
    return getPosts().find((p) => p.id === id);
  }

  function getLiked() {
    return lsGet(LIKED_KEY, []);
  }

  function getSaved() {
    return lsGet(SAVED_KEY, []);
  }

  function getShared() {
    return lsGet(SHARED_KEY, {});
  }

  function getModelSaved() {
    return lsGet(MODEL_SAVED_KEY, []);
  }

  function parseQuery() {
    const hash = location.hash || '';
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return {};
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const obj = {};
    params.forEach((v, k) => { obj[k] = v; });
    return obj;
  }

  function navigate(route, query) {
    if (window.OPC?.navigate) {
      window.OPC.navigate(route, query || null);
      return;
    }
    let hash = `#${route}`;
    if (query && Object.keys(query).length) {
      hash += '?' + new URLSearchParams(query).toString();
    }
    location.hash = hash.slice(1);
  }

  function showToast(msg, link) {
    let el = document.getElementById('opc-square-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'opc-square-toast';
      el.className = 'opc-square-toast';
      document.body.appendChild(el);
    }
    el.innerHTML = msg + (link ? `<a href="${link.href}" data-nav="${link.route}">${link.text}</a>` : '');
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  function isLiked(id) {
    return getLiked().includes(id);
  }

  function isSaved(id) {
    return getSaved().includes(id);
  }

  function isModelSaved(postId) {
    return getModelSaved().includes(postId);
  }

  function toggleLike(id) {
    const liked = getLiked();
    const posts = getPosts();
    const post = posts.find((p) => p.id === id);
    if (!post) return;

    const idx = liked.indexOf(id);
    if (idx >= 0) {
      liked.splice(idx, 1);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      liked.push(id);
      post.likes += 1;
    }
    lsSet(LIKED_KEY, liked);
    savePosts(posts);
  }

  function toggleSave(id) {
    const saved = getSaved();
    const posts = getPosts();
    const post = posts.find((p) => p.id === id);
    if (!post) return;

    const idx = saved.indexOf(id);
    if (idx >= 0) {
      saved.splice(idx, 1);
      post.saves = Math.max(0, post.saves - 1);
    } else {
      saved.push(id);
      post.saves += 1;
      showToast('已收藏作品');
    }
    lsSet(SAVED_KEY, saved);
    savePosts(posts);
  }

  function saveModelFromPost(post) {
    if (!post.allowSaveModel || !post.model) return false;
    if (isModelSaved(post.id)) return 'exists';

    const model = {
      id: `sq-${post.id}`,
      name: post.model.name || `广场模特 · ${post.author.name}`,
      height: post.model.height || 175,
      gender: post.model.gender || '女',
      tags: ['广场', ...post.tags.slice(0, 2)],
      image: post.model.src || post.image,
      isPreset: false,
      isCommunity: true,
      sourcePostId: post.id,
      createdAt: Date.now(),
    };

    const models = lsGet(MODEL_KEY, []);
    if (models.some((m) => m.id === model.id)) return 'exists';

    models.push(model);
    lsSet(MODEL_KEY, models);

    const saved = getModelSaved();
    saved.push(post.id);
    lsSet(MODEL_SAVED_KEY, saved);

    if (window.OPC?.ModelLibrary?.renderModelLibrary) {
      window.OPC.ModelLibrary.renderModelLibrary?.();
    }
    window.dispatchEvent(new CustomEvent('opc-model-library-updated'));

    return 'ok';
  }

  function filterPosts(posts) {
    let result = [...posts];

    if (state.tab === 'latest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (state.tab === 'model') {
      result = result.filter((p) => p.type === 'model');
    } else if (state.tab === 'tryon') {
      result = result.filter((p) => p.type === 'tryon');
    } else if (state.tab === 'top') {
      result.sort((a, b) => b.likes - a.likes);
    } else if (state.tab === 'following') {
      result = [];
    } else {
      result.sort((a, b) => b.likes * 0.6 + b.saves * 0.4 - (a.likes * 0.6 + a.saves * 0.4));
    }

    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (state.chip) {
      if (state.chip === '可保存模特') {
        result = result.filter((p) => p.allowSaveModel);
      } else if (state.chip === '可复用风格') {
        result = result.filter((p) => p.allowRemix);
      } else if (state.chip === '男装') {
        result = result.filter((p) => p.tags.includes('男装') || p.model?.gender === '男');
      } else if (state.chip === '女装') {
        result = result.filter((p) => p.tags.includes('女装') || p.model?.gender === '女' || !p.model);
      } else {
        result = result.filter((p) => p.tags.includes(state.chip));
      }
    }

    return result;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(post, index) {
    const liked = isLiked(post.id);
    const delay = Math.min(index * 0.05, 0.4);
    return `
    <article class="opc-square-card" data-square-post="${post.id}" style="animation-delay:${delay}s">
      <div class="opc-square-card-media">
        <img src="${post.image}" alt="${escapeHtml(post.title)}" loading="lazy"/>
        <span class="opc-square-card-type">${TYPE_LABELS[post.type] || post.type}</span>
        <div class="opc-square-card-actions">
          <button type="button" data-square-like="${post.id}" class="${liked ? 'is-liked' : ''}" aria-label="点赞">
            <span class="material-symbols-outlined text-[14px]" style="${liked ? "font-variation-settings:'FILL' 1" : ''}">favorite</span>
            ${post.likes}
          </button>
          <button type="button" data-square-goto="${post.id}" aria-label="评论">
            <span class="material-symbols-outlined text-[14px]">chat_bubble</span>
            ${(post.comments || []).length}
          </button>
          <button type="button" data-square-save-post="${post.id}" aria-label="收藏">
            <span class="material-symbols-outlined text-[14px]" style="${isSaved(post.id) ? "font-variation-settings:'FILL' 1" : ''}">bookmark</span>
          </button>
        </div>
      </div>
      <div class="opc-square-card-body">
        <div class="opc-square-card-author">
          <img src="${post.author.avatar}" alt=""/>
          <span>${escapeHtml(post.author.name)}</span>
        </div>
        <h3 class="opc-square-card-title">${escapeHtml(post.title)}</h3>
        <p class="opc-square-card-desc">${escapeHtml(post.description)}</p>
        <div class="opc-square-card-tags">${post.tags.slice(0, 3).map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>
        <div class="opc-square-card-stats">
          <span><span class="material-symbols-outlined text-[14px]">favorite</span>${post.likes}</span>
          <span><span class="material-symbols-outlined text-[14px]">chat_bubble</span>${(post.comments || []).length}</span>
          <span><span class="material-symbols-outlined text-[14px]">bookmark</span>${post.saves}</span>
        </div>
      </div>
    </article>`;
  }

  function renderSquareHome() {
    const grid = document.getElementById('opc-square-grid');
    if (!grid) return;

    const posts = filterPosts(getPosts());
    if (posts.length === 0) {
      grid.innerHTML = `<div class="opc-square-empty"><span class="material-symbols-outlined">search_off</span><p>还没有相关内容，换个关键词试试</p></div>`;
      return;
    }
    grid.innerHTML = posts.map((p, i) => renderCard(p, i)).join('');
  }

  function renderSquareDetail() {
    const container = document.getElementById('opc-square-detail-root');
    if (!container) return;

    const query = parseQuery();
    const post = getPost(query.id);
    if (!post) {
      container.innerHTML = `<div class="opc-square-empty"><p>作品不存在</p><button type="button" class="opc-square-btn-primary" data-goto="square">返回广场</button></div>`;
      return;
    }

    const liked = isLiked(post.id);
    const saved = isSaved(post.id);
    const modelSaved = isModelSaved(post.id);

    container.innerHTML = `
    <button type="button" class="opc-square-back" data-goto="square"><span class="material-symbols-outlined text-[18px]">arrow_back</span>返回广场</button>
    <div class="opc-square-detail">
      <div class="opc-square-detail-media">
        <img src="${post.image}" alt="${escapeHtml(post.title)}" data-opc-preview-zoom/>
        ${post.garmentName ? `<p style="padding:12px 16px;font-size:13px;color:#6b7280">服装：${escapeHtml(post.garmentName)} · 生成模式：${TYPE_LABELS[post.type]}</p>` : ''}
      </div>
      <div class="opc-square-detail-info glass-panel opc-panel">
        <div class="opc-square-detail-author">
          <img src="${post.author.avatar}" alt=""/>
          <div>
            <span class="opc-square-detail-author-name">${escapeHtml(post.author.name)}</span>
            ${post.author.badge ? `<span class="opc-square-detail-badge">${escapeHtml(post.author.badge)}</span>` : ''}
          </div>
          <button type="button" class="opc-square-detail-follow">关注</button>
        </div>
        <h1 class="opc-square-detail-title">${escapeHtml(post.title)}</h1>
        <p class="opc-square-detail-desc">${escapeHtml(post.description)}</p>
        <div class="opc-square-detail-meta">${post.tags.map((t) => `<span class="opc-tag bg-primary/10 text-primary">${escapeHtml(t)}</span>`).join('')}</div>
        <div class="opc-square-detail-actions">
          ${post.allowSaveModel && post.model ? `<button type="button" class="${modelSaved ? 'is-success' : 'is-primary'}" data-square-save-model="${post.id}"><span class="material-symbols-outlined">person_add</span>${modelSaved ? '已保存到模特库' : '保存模特'}</button>` : ''}
          ${post.model ? `<button type="button" class="is-secondary" data-square-remix-model="${post.id}"><span class="material-symbols-outlined">checkroom</span>用同款模特试衣</button>` : ''}
          ${post.allowRemix ? `<button type="button" class="is-secondary" data-square-remix-style="${post.id}"><span class="material-symbols-outlined">auto_fix_high</span>参考此风格生成</button>` : ''}
          <button type="button" class="is-ghost opc-square-like-btn ${liked ? 'is-liked' : ''}" data-square-like="${post.id}"><span class="material-symbols-outlined" style="${liked ? "font-variation-settings:'FILL' 1" : ''}">favorite</span>${liked ? '已点赞' : '点赞'} · ${post.likes}</button>
          <button type="button" class="is-ghost" data-square-save-post="${post.id}"><span class="material-symbols-outlined" style="${saved ? "font-variation-settings:'FILL' 1" : ''}">bookmark</span>${saved ? '已收藏' : '收藏作品'} · ${post.saves}</button>
        </div>
        <div class="opc-square-comments">
          <h3>评论 (${(post.comments || []).length})</h3>
          <div class="opc-square-comment-suggestions">
            <button type="button" data-square-suggest="这个模特很适合通勤风">这个模特很适合通勤风</button>
            <button type="button" data-square-suggest="想看同款男装效果">想看同款男装效果</button>
            <button type="button" data-square-suggest="配色很高级">配色很高级</button>
            <button type="button" data-square-suggest="可以试试更宽松的版型">可以试试更宽松的版型</button>
          </div>
          <div class="opc-square-comment-input">
            <input type="text" id="opc-square-comment-field" placeholder="说说你喜欢这个试衣效果的哪里…" maxlength="200"/>
            <button type="button" id="opc-square-comment-submit" data-square-comment-submit="${post.id}" disabled>发送</button>
          </div>
          <div class="opc-square-comment-list" id="opc-square-comment-list">
            ${(post.comments || []).map((c) => `
              <div class="opc-square-comment-item">
                <img src="${c.avatar || AVATAR}" alt=""/>
                <div class="opc-square-comment-body">
                  <p class="opc-square-comment-name">${escapeHtml(c.user)}</p>
                  <p class="opc-square-comment-text">${escapeHtml(c.text)}</p>
                  <p class="opc-square-comment-time">${escapeHtml(c.time)}</p>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

    const input = document.getElementById('opc-square-comment-field');
    const submitBtn = document.getElementById('opc-square-comment-submit');
    if (input && submitBtn) {
      input.addEventListener('input', () => {
        submitBtn.disabled = !input.value.trim();
      });
    }
  }

  function renderSquarePublish() {
    const container = document.getElementById('opc-square-publish-root');
    if (!container) return;

    const query = parseQuery();
    const workId = query.workId;
    const work = workId ? GALLERY_WORKS[workId] : null;

    if (!work) {
      container.innerHTML = `
      <button type="button" class="opc-square-back" data-goto="gallery"><span class="material-symbols-outlined text-[18px]">arrow_back</span>返回我的作品</button>
      <div class="opc-square-empty glass-panel opc-panel" style="padding:48px">
        <span class="material-symbols-outlined">photo_library</span>
        <p style="margin:12px 0">请从我的作品中选择要发布的作品</p>
        <button type="button" class="opc-square-btn-primary" data-goto="gallery">去我的作品</button>
      </div>`;
      return;
    }

    const shared = getShared();
    if (shared[workId]) {
      container.innerHTML = `
      <button type="button" class="opc-square-back" data-goto="gallery"><span class="material-symbols-outlined text-[18px]">arrow_back</span>返回我的作品</button>
      <div class="opc-square-empty glass-panel opc-panel" style="padding:48px">
        <span class="material-symbols-outlined">check_circle</span>
        <p style="margin:12px 0">该作品已发布到广场</p>
        <button type="button" class="opc-square-btn-primary" data-goto="square-detail" data-square-query="id=${shared[workId]}">查看发布</button>
      </div>`;
      return;
    }

    state.publishTags = [...(work.tags || [])];

    container.innerHTML = `
    <button type="button" class="opc-square-back" data-goto="gallery"><span class="material-symbols-outlined text-[18px]">arrow_back</span>返回我的作品</button>
    <header class="opc-square-header" style="margin-bottom:24px">
      <div><h1>发布到广场</h1><p>分享你的 AI 试衣效果，让大家一起参考</p></div>
    </header>
    <div class="opc-square-publish">
      <div class="opc-square-publish-preview"><img src="${work.image}" alt="${escapeHtml(work.title)}"/></div>
      <form class="opc-square-publish-form glass-panel opc-panel" id="opc-square-publish-form" data-work-id="${workId}">
        <div>
          <label for="sq-publish-title">标题 <span style="color:#ef4444">*</span></label>
          <input type="text" id="sq-publish-title" maxlength="30" placeholder="给作品起个名字" value="${escapeHtml(work.title)}" required/>
        </div>
        <div>
          <label for="sq-publish-desc">描述</label>
          <textarea id="sq-publish-desc" maxlength="120" placeholder="分享一下模特、服装或生成思路"></textarea>
        </div>
        <div>
          <label>内容类型</label>
          <div class="opc-square-type-radio">
            <label><input type="radio" name="sq-type" value="model" ${work.type === 'model' ? 'checked' : ''}/><span>模特</span></label>
            <label><input type="radio" name="sq-type" value="tryon" ${work.type === 'tryon' || !work.type ? 'checked' : ''}/><span>试衣图</span></label>
            <label><input type="radio" name="sq-type" value="collection"/><span>搭配合集</span></label>
          </div>
        </div>
        <div>
          <label for="sq-publish-tag-input">标签（最多 6 个）</label>
          <input type="text" id="sq-publish-tag-input" placeholder="添加标签，如 通勤、韩系、高定"/>
          <div class="opc-square-publish-tags" id="sq-publish-tags">${state.publishTags.map((t) => `<span>${escapeHtml(t)}<button type="button" data-remove-tag="${escapeHtml(t)}">×</button></span>`).join('')}</div>
        </div>
        ${work.model ? `<div class="opc-square-switch-row"><span>允许保存模特</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="sq-allow-model" checked class="sr-only peer"/><div class="w-10 h-5 bg-surface-variant rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div></label></div>` : ''}
        <div class="opc-square-switch-row"><span>允许他人复用风格</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="sq-allow-remix" checked class="sr-only peer"/><div class="w-10 h-5 bg-surface-variant rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div></label></div>
        <button type="submit" class="opc-square-btn-primary" style="width:100%;justify-content:center;padding:14px">发布</button>
      </form>
    </div>`;
  }

  function publishWork(workId) {
    const work = GALLERY_WORKS[workId];
    if (!work) return;

    const title = document.getElementById('sq-publish-title')?.value?.trim();
    if (!title) {
      alert('请填写标题');
      return;
    }

    const desc = document.getElementById('sq-publish-desc')?.value?.trim() || '';
    const type = document.querySelector('input[name="sq-type"]:checked')?.value || 'tryon';
    const allowSaveModel = document.getElementById('sq-allow-model')?.checked ?? false;
    const allowRemix = document.getElementById('sq-allow-remix')?.checked ?? true;

    const newPost = {
      id: 'sq-user-' + Date.now(),
      author: { id: 'me', name: '林舒然', avatar: AVATAR, badge: '创作者' },
      type,
      title,
      description: desc,
      image: work.image,
      model: work.model,
      tags: [...state.publishTags],
      likes: 0,
      comments: [],
      saves: 0,
      allowSaveModel: allowSaveModel && !!work.model,
      allowRemix,
      stylePrompt: work.stylePrompt || title,
      createdAt: new Date().toISOString(),
      isMine: true,
    };

    const posts = getPosts();
    posts.unshift(newPost);
    savePosts(posts);

    const shared = getShared();
    shared[workId] = newPost.id;
    lsSet(SHARED_KEY, shared);

    showToast('已发布到广场');
    navigate('square-detail', { id: newPost.id });
    syncGallerySharedBadges();
  }

  function addComment(postId, text) {
    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post || !text.trim()) return;

    if (!post.comments) post.comments = [];
    post.comments.unshift({
      id: 'c-' + Date.now(),
      user: '林舒然',
      avatar: AVATAR,
      text: text.trim(),
      time: '刚刚',
    });
    savePosts(posts);
    renderSquareDetail();
  }

  function remixModel(postId) {
    const post = getPost(postId);
    if (!post?.model) return;

    lsSet(REMIX_KEY, {
      type: 'model',
      postId,
      title: post.title,
      model: post.model,
    });

    if (window.OPC?.ModelLibrary?.selectModel) {
      window.OPC.ModelLibrary.selectModel(`sq-${postId}`);
    }

    navigate('model');
    showRemixBanner(post.title);
  }

  function remixStyle(postId) {
    const post = getPost(postId);
    if (!post) return;

    lsSet(REMIX_KEY, {
      type: 'style',
      postId,
      title: post.title,
      stylePrompt: post.stylePrompt || post.tags.join('，'),
    });

    navigate('free');

    requestAnimationFrame(() => {
      const prompt = document.getElementById('prompt-input');
      if (prompt) {
        prompt.value = post.stylePrompt || post.tags.join('，');
        prompt.dispatchEvent(new Event('input', { bubbles: true }));
      }
      showRemixBanner(post.title);
    });
  }

  function showRemixBanner(title) {
    document.querySelectorAll('.opc-square-remix-banner').forEach((el) => el.remove());
    const banner = document.createElement('div');
    banner.className = 'opc-square-remix-banner';
    banner.innerHTML = `<span class="material-symbols-outlined">auto_awesome</span>正在参考「${escapeHtml(title)}」的风格<button type="button" aria-label="关闭">&times;</button>`;
    banner.querySelector('button').addEventListener('click', () => banner.remove());
    const header = document.getElementById('opc-top-header');
    if (header) header.after(banner);
  }

  function renderHomeFeatured() {
    const grid = document.getElementById('opc-square-home-grid');
    if (!grid) return;

    const top = [...getPosts()].sort((a, b) => b.likes - a.likes).slice(0, 3);
    grid.innerHTML = top.map((p) => `
      <div class="opc-square-home-card glass-panel" data-square-goto="${p.id}" role="link" tabindex="0">
        <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy"/>
        <div class="opc-square-home-card-overlay">
          <h4>${escapeHtml(p.title)}</h4>
          <p>${p.likes} 赞 · ${escapeHtml(p.author.name)}</p>
        </div>
      </div>`).join('');
  }

  function syncGallerySharedBadges() {
    const shared = getShared();
    document.querySelectorAll('[data-opc-work-id]').forEach((card) => {
      const workId = card.getAttribute('data-opc-work-id');
      let badge = card.querySelector('.opc-gallery-shared-badge');
      if (shared[workId]) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'opc-gallery-shared-badge';
          badge.textContent = '已发布';
          card.querySelector('.opc-gallery-card-media')?.prepend(badge);
        }
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function enhanceGalleryCards() {
    const cards = document.querySelectorAll('.opc-gallery-card[data-opc-gallery-status="done"]');
    const ids = ['work-1', 'work-2', 'work-3'];
    cards.forEach((card, i) => {
      if (i >= ids.length) return;
      const workId = ids[i];
      card.setAttribute('data-opc-work-id', workId);

      const overlay = card.querySelector('.opc-gallery-overlay');
      if (overlay && !overlay.querySelector('[data-opc-share-square]')) {
        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'px-4 h-10 flex items-center gap-2 bg-white/90 text-primary rounded-full font-label-md text-label-md shadow-lg hover:bg-white transition-colors';
        shareBtn.setAttribute('data-opc-share-square', workId);
        shareBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">share</span> 发布到广场';
        overlay.insertBefore(shareBtn, overlay.firstChild);
      }
    });
    syncGallerySharedBadges();
  }

  function onRouteChange(route) {
    if (route === 'square') renderSquareHome();
    else if (route === 'square-detail') renderSquareDetail();
    else if (route === 'square-publish') renderSquarePublish();
    else if (route === 'home') renderHomeFeatured();
    else if (route === 'gallery') enhanceGalleryCards();
  }

  function handleClick(e) {
    const likeBtn = e.target.closest('[data-square-like]');
    if (likeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = likeBtn.getAttribute('data-square-like');
      toggleLike(id);
      const icon = likeBtn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.classList.add('like-pop');
        setTimeout(() => icon.classList.remove('like-pop'), 350);
      }
      onRouteChange(window.OPC?.parseRoute?.() || 'square');
      return;
    }

    const savePostBtn = e.target.closest('[data-square-save-post]');
    if (savePostBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleSave(savePostBtn.getAttribute('data-square-save-post'));
      onRouteChange(window.OPC?.parseRoute?.() || 'square');
      return;
    }

    const saveModelBtn = e.target.closest('[data-square-save-model]');
    if (saveModelBtn) {
      e.preventDefault();
      const postId = saveModelBtn.getAttribute('data-square-save-model');
      const post = getPost(postId);
      if (!post) return;

      if (isModelSaved(postId)) {
        navigate('model-library');
        return;
      }

      const result = saveModelFromPost(post);
      if (result === 'ok') {
        showToast('已保存到模特库，可在「模特库 → 已有模特」中查看', { route: 'model-library', href: '#model-library', text: '去模特库查看' });
      }
      renderSquareDetail();
      return;
    }

    const remixModelBtn = e.target.closest('[data-square-remix-model]');
    if (remixModelBtn) {
      e.preventDefault();
      remixModel(remixModelBtn.getAttribute('data-square-remix-model'));
      return;
    }

    const remixStyleBtn = e.target.closest('[data-square-remix-style]');
    if (remixStyleBtn) {
      e.preventDefault();
      remixStyle(remixStyleBtn.getAttribute('data-square-remix-style'));
      return;
    }

    const gotoPost = e.target.closest('[data-square-goto], [data-square-post]');
    if (gotoPost) {
      e.preventDefault();
      const id = gotoPost.getAttribute('data-square-goto') || gotoPost.getAttribute('data-square-post');
      if (id) navigate('square-detail', { id });
      return;
    }

    const shareBtn = e.target.closest('[data-opc-share-square]');
    if (shareBtn) {
      e.preventDefault();
      e.stopPropagation();
      navigate('square-publish', { workId: shareBtn.getAttribute('data-opc-share-square') });
      return;
    }

    const suggestBtn = e.target.closest('[data-square-suggest]');
    if (suggestBtn) {
      const input = document.getElementById('opc-square-comment-field');
      if (input) {
        input.value = suggestBtn.getAttribute('data-square-suggest');
        input.dispatchEvent(new Event('input'));
      }
      return;
    }

    const commentSubmit = e.target.closest('[data-square-comment-submit]');
    if (commentSubmit) {
      e.preventDefault();
      const postId = commentSubmit.getAttribute('data-square-comment-submit');
      const input = document.getElementById('opc-square-comment-field');
      if (input?.value.trim()) {
        addComment(postId, input.value);
      }
      return;
    }

    const queryGoto = e.target.closest('[data-square-query]');
    if (queryGoto) {
      e.preventDefault();
      const q = queryGoto.getAttribute('data-square-query');
      if (q) {
        const params = {};
        q.split('&').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k) params[k] = v;
        });
        navigate(queryGoto.getAttribute('data-goto') || 'square-detail', params);
      }
    }
  }

  function handleSubmit(e) {
    if (e.target.id === 'opc-square-publish-form') {
      e.preventDefault();
      publishWork(e.target.getAttribute('data-work-id'));
    }
  }

  function handleInput(e) {
    if (e.target.id === 'opc-square-search') {
      state.search = e.target.value;
      renderSquareHome();
    }
    if (e.target.id === 'sq-publish-tag-input' && e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val && state.publishTags.length < 6 && !state.publishTags.includes(val)) {
        state.publishTags.push(val);
        e.target.value = '';
        const tagsEl = document.getElementById('sq-publish-tags');
        if (tagsEl) {
          tagsEl.innerHTML = state.publishTags.map((t) => `<span>${escapeHtml(t)}<button type="button" data-remove-tag="${escapeHtml(t)}">×</button></span>`).join('');
        }
      }
    }
  }

  function initSquarePage() {
    document.querySelectorAll('[data-square-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-square-tab]').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.tab = btn.getAttribute('data-square-tab');
        renderSquareHome();
      });
    });

    document.querySelectorAll('[data-square-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chip = btn.getAttribute('data-square-chip');
        if (state.chip === chip) {
          state.chip = '';
          btn.classList.remove('is-active');
        } else {
          document.querySelectorAll('[data-square-chip]').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          state.chip = chip;
        }
        renderSquareHome();
      });
    });

    const search = document.getElementById('opc-square-search');
    if (search) search.addEventListener('input', handleInput);

    document.getElementById('opc-square-publish-btn')?.addEventListener('click', () => navigate('gallery'));
    document.getElementById('opc-square-my-posts-btn')?.addEventListener('click', () => {
      state.tab = 'latest';
      document.querySelectorAll('[data-square-tab]').forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-square-tab') === 'latest');
      });
      renderSquareHome();
    });
  }

  function init() {
    getPosts();
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('keydown', (e) => {
      if (e.target.id === 'sq-publish-tag-input' && e.key === 'Enter') handleInput(e);
    });
    document.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove-tag]');
      if (rm) {
        const tag = rm.getAttribute('data-remove-tag');
        state.publishTags = state.publishTags.filter((t) => t !== tag);
        rm.closest('.opc-square-publish-tags').innerHTML = state.publishTags.map((t) => `<span>${escapeHtml(t)}<button type="button" data-remove-tag="${escapeHtml(t)}">×</button></span>`).join('');
      }
    });

    initSquarePage();
    enhanceGalleryCards();
    renderHomeFeatured();

    window.addEventListener('opc-route-change', (e) => {
      onRouteChange(e.detail?.route);
    });

    onRouteChange(window.OPC?.parseRoute?.() || 'home');
  }

  window.OPCSquare = {
    getPosts,
    getPost,
    renderSquareHome,
    renderHomeFeatured,
    GALLERY_WORKS,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
