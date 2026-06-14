BASE_GENERATION_COST = 5
MODE_COST_MULTIPLIERS = {"model": 1.0, "real": 1.2, "free": 1.0}
MODE_COSTS = {mode: int(BASE_GENERATION_COST * multiplier) for mode, multiplier in MODE_COST_MULTIPLIERS.items()}

DEMO_IMAGES = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDVof0tdfpgZDW7gpB7FDkcCHhvmFaJgMeycPS_D1hqQA4PUAWOE78RZMeyiR4C-ehcbaRVn7AHyZub-KzAmfky2V2T_hSsf3TBc7V5rO0AwHHpWA4wE4ou44Lfp8hT69bkq44diPVdB1XbB7uxm0FYDHXzAq5TFJW4xB-3WQAIyeNSpiRsA3YX2-6wxQCY0G2gWeqMeyvL8SMdZi5GrWfzoeTqVgkTlfn2KKWS6KC1yhwvroUULAD8WbU0OTJBEsyrzsp8Jp7K",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuApL9y2vTESD99DHU3WQq-NMtDNmwGX-pvLkYiajxJTrz65FBMHqKQN_jB_pRtf0hfhxtUuI6EQEt3R8_cDhucrEYJIRLnXH-yzDPFYBjB2PyH-rcYfzif_4-NiS7IxkGmeKOtERfQySRIMr_CUmqNN4H-si21nc5Ij5blNSHUujV9JhkzpN5I4s495YYP41DYigch5Ay1DlhvS26tZ45PG2Fx4RCURhypzDnVWZnpip1YyWd7JAZK4gbgTw92C4MC0QS5DeRBJsfv6",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCgNAIIEWpIi67nYxFbpivtr4MgV-AXre2ENgE0kmUFcBOAxm8-QLb7iVRJmrLYYS5Hh9GMatQHfWVM0iEfudd9wcVwVvIK65uukqGTPcfLubI6N_KATKbLcx1G3bnkfmlvNi9YcnFzhpB8nCQssWzM_pguykMBBTJ9nVMMhXoOgr8mjegY-rcMpdI1GaNKoKDg_Brm_lc4doAsFNKpQRp2zBObxb1iF07X1kNLPMba82H1udY2-TuZBuGsWAQrZFCowYcIIMzhzZhT",
]

PRESET_MODELS = [
    {
        "id": "preset-1",
        "name": "林娅",
        "height": 175,
        "gender": "女",
        "tags": ["休闲", "时髦"],
        "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuD6pFLFdiilaCjJ0L7hleEDEezJ_DnTkX_Blso6vgkNVHohbEKvLWim9Rz_5R4bthEWoDrEo38ixHDgESj31dV6AxVwqo0i_vU7pt06kN3BoNFYqP_bNWWFX8tocYfeXsOR20IQ4hfOXgMyjpvI7yyyfIxsjGNWrYs1nGTonY-FRbyKEJNOsAyhQSDT7_Hp5r4tkFu48rovC9qL2WB4My-uFbNnBtNvPQp6r3yzqEDvt8J6BQIrDwoTAsj3gXnPnwoDAuD6P7m3isr9",
        "isPreset": True,
    },
    {
        "id": "preset-2",
        "name": "陈伟",
        "height": 185,
        "gender": "男",
        "tags": ["街头", "运动"],
        "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCTSjyrX0R7GH-ilVa-dfo80eEh32kzCUwvi_v08SwhJTzuhZ1FuYZAZFKQuToF1s_HAxKZs4DUxmviZQ4zh2-hBrm0eQujfEJgs0E_Eqjc7tWOQw8cpPT1VvJY_Y3BbZy6DG_oPQ6Sa6a8lvOlYQSZeGn4nwroYYvWkyyHF_u6gCMFVYVvdJa28KS1JQB-Fc0l993IGNKhM1rLSEuiOm8QepbX_k92twwEPTtp0aI2lCXJr1Qn2ETaqhpTfCvcZAPtjOUeNfrmi7rB",
        "isPreset": True,
    },
    {
        "id": "preset-3",
        "name": "小雪",
        "height": 170,
        "gender": "女",
        "tags": ["优雅", "高定"],
        "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDqlRz4zEnk4gE1xTXOqB9bUIedw_jsGymcyLc6J-pH7tpEOdFIrxxCZMABt7dhzhUECSfGvUD0pAqSA5dBxy3jF3tAe45UGGAd3ZF9QsMOyE69UsTmvmdM3SGvWxyi2bMHhMDEeB-iZJ-PxqMhCkuP1ID7f_ZoZFSJb0MVjhFZn6sdANDVdbc7_24vS6M83PDkSk-c-26-33wfILvh8HwpsUen35z7NH0FQfrTPYqU7214sfJJLf7wutXOBBd23tvewp-vjKOaDqQz",
        "isPreset": True,
    },
]

DEFAULT_SQUARE_POSTS = [
    {
        "author_name": "穿搭达人小雅",
        "author_badge": "穿搭达人",
        "post_type": "model",
        "title": "通勤风虚拟模特 · 林娅同款",
        "description": "适合职场通勤的 AI 模特，身形比例自然，可直接用于试衣。",
        "image_url": PRESET_MODELS[0]["image"],
        "model": {"name": "林娅", "height": 175, "gender": "女", "src": PRESET_MODELS[0]["image"]},
        "tags": ["通勤", "女装", "模特"],
        "likes": 128,
        "saves": 45,
        "allow_save_model": True,
        "allow_remix": True,
        "style_prompt": "职场通勤风，简约干练，自然光线",
    },
    {
        "author_name": "Summer试衣间",
        "author_badge": "创作者",
        "post_type": "tryon",
        "title": "夏日通勤白裙试衣效果",
        "description": "平台模特 + 白色连衣裙，影棚自然光，适合商品展示。",
        "image_url": DEMO_IMAGES[0],
        "model": {"name": "林娅", "height": 175, "gender": "女", "src": PRESET_MODELS[0]["image"]},
        "tags": ["通勤", "女装", "试衣图"],
        "likes": 342,
        "saves": 156,
        "allow_save_model": True,
        "allow_remix": True,
        "style_prompt": "夏日通勤，白色连衣裙，自然影棚光，清新简约",
    },
    {
        "author_name": "AI造型实验室",
        "author_badge": "实验室",
        "post_type": "tryon",
        "title": "韩系简约风试衣",
        "description": "自由风格生成，韩系简约配色，适合日常穿搭参考。",
        "image_url": DEMO_IMAGES[1],
        "model": None,
        "tags": ["韩系", "女装", "极简"],
        "likes": 256,
        "saves": 89,
        "allow_save_model": False,
        "allow_remix": True,
        "style_prompt": "韩系简约，低饱和配色，干净背景，松弛感",
    },
]
