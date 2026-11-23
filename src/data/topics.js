import { MOOD_TAGS } from "./verseMoods.js";
import { verses } from "./verses.js";
import { parseBibleReference } from "./bibleParser.js";

export const TOPICS = [
  {
    slug: "gratitude",
    name: "Gratitude",
    category: "Gratitude",
    seoTitle: "Bible Verses & Devotionals for Gratitude",
    metaDescription:
      "Discover Bible verses, guided devotionals, and a short prayer for cultivating daily gratitude and noticing God's faithfulness in every season.",
    headline: "Rooting Your Heart in Daily Gratitude",
    intro:
      "Thankfulness shifts our gaze from what feels scarce to the steady faithfulness of God already surrounding us. Whether today feels abundant or demanding, practicing gratitude anchors the soul in praise.",
    shortPrayer:
      "Father, open my eyes to notice every quiet mercy You placed along my path today. Teach my heart to answer Your faithfulness with steady thanksgiving in every season.",
    cover: "/assets/images/plans/gratitude-harvest.png",
    testimonyTags: ["Gratitude", "Answered Prayer", "Joy"],
    relatedSlugs: ["joy", "peace", "hope", "patience"],
    moodKey: "Grateful",
    faqs: [
      {
        q: "How can I practice biblical gratitude during a difficult week?",
        a: "Biblical thanksgiving does not pretend pain is absent; rather, 1 Thessalonians 5:18 invites us to give thanks in all circumstances by remembering God's unchanging presence, past deliverance, and daily mercies.",
      },
      {
        q: "What are the best Psalms to read for thankfulness?",
        a: "Psalm 100, Psalm 103, and Psalm 136 offer rich declarations of praise and remembrance that help recenter a distracted heart around God's steadfast love.",
      },
      {
        q: "Why does keeping a gratitude journal strengthen faith?",
        a: "Recording answered prayers and everyday blessings builds a visible record of God's faithfulness that encourages your trust whenever new trials arrive.",
      },
    ],
  },
  {
    slug: "anxiety",
    name: "Anxiety",
    category: "Anxiety",
    seoTitle: "Bible Verses & Devotionals for Anxiety",
    metaDescription:
      "Find calming Scripture passages, devotional reading plans, and prayer support to trade anxious overthinking for the steady peace of Christ.",
    headline: "Bringing Anxious Thoughts to Quiet Rest",
    intro:
      "When tomorrow feels uncertain and worry crowds out stillness, Scripture invites us to place every burden into hands stronger than our own. Jesus meets anxious hearts with gentleness rather than shame.",
    shortPrayer:
      "Lord Jesus, quiet the racing thoughts within me and remind me that You hold every hour ahead. I cast my cares upon You today and receive Your guarding peace.",
    cover: "/assets/images/plans/anxiety-still-lake.png",
    testimonyTags: ["Peace", "Hope", "Strength"],
    relatedSlugs: ["peace", "fear", "stress", "doubt"],
    moodKey: "Anxious",
    faqs: [
      {
        q: "What does Philippians 4:6-7 say to do when anxiety rises?",
        a: "Paul urges believers to bring every specific concern to God through prayer and thanksgiving, promising that the peace of God will guard their hearts and minds in Christ Jesus.",
      },
      {
        q: "Is feeling anxious a sign of weak faith?",
        a: "No; even faithful figures like David and Elijah experienced deep distress. Casting your cares on God (1 Peter 5:7) is an act of active trust, not spiritual failure.",
      },
      {
        q: "How do short daily devotionals help calm anxious habits?",
        a: "Replacing frantic scrolling with unhurried reflection on God's promises trains the mind to return to truth and breathe deeply before worry spirals.",
      },
    ],
  },
  {
    slug: "peace",
    name: "Peace",
    category: "Peace",
    seoTitle: "Bible Verses & Devotionals for Peace",
    metaDescription:
      "Explore Scripture verses on God's peace, guided devotional plans, and prayers that restore calm amidst noise, conflict, and uncertainty.",
    headline: "Guarded by the Peace Christ Gives",
    intro:
      "The peace Jesus offers is deeper than a calm schedule; it is a steady confidence anchored in His presence even when circumstances shift. Through Word and prayer, restless hearts learn to abide in stillness.",
    shortPrayer:
      "Prince of Peace, speak calm over the storms in my thoughts and relationships today. Keep my heart anchored in Your nearness rather than shifting headlines.",
    cover: "/assets/images/plans/peace-olive-branch.png",
    testimonyTags: ["Peace", "Gratitude", "Love"],
    relatedSlugs: ["anxiety", "stress", "patience", "gratitude"],
    moodKey: "Anxious",
    faqs: [
      {
        q: "How is Jesus' peace different from worldly calm?",
        a: "In John 14:27, Jesus promises a peace independent of easy circumstances—rooted in reconciliation with God and the ongoing comfort of the Holy Spirit.",
      },
      {
        q: "Which scriptures speak directly to a troubled mind?",
        a: "Isaiah 26:3, Colossians 3:15, and John 16:33 remind believers that keeping the mind stayed on God brings steady wholeness even amid tribulation.",
      },
      {
        q: "How can I cultivate peace in strained relationships?",
        a: "Romans 12:18 encourages pursuing peace earnestly, pairing humility and honest listening with forgiving grace extended as Christ forgave us.",
      },
    ],
  },
  {
    slug: "hope",
    name: "Hope",
    category: "Hope",
    seoTitle: "Bible Verses & Devotionals for Hope",
    metaDescription:
      "Read uplifting Bible verses on hope, guided devotionals, and encouragement designed to brighten weary seasons with God's sure promises.",
    headline: "Anchoring the Soul in Living Hope",
    intro:
      "Christian hope is not wishful thinking; it is confident expectation built on God's character and His resurrection promise. Even faint embers glow brighter when fed with Scripture.",
    shortPrayer:
      "God of hope, lift my eyes beyond present delays and disappointments to see Your faithful purpose at work. Fill me with fresh endurance and quiet joy as I trust You.",
    cover: "/assets/images/plans/hope-dawn-horizon.png",
    testimonyTags: ["Hope", "Answered Prayer", "Strength"],
    relatedSlugs: ["depression", "patience", "healing", "joy"],
    moodKey: "Weary",
    faqs: [
      {
        q: "What makes biblical hope different from optimism?",
        a: "While optimism guesses things might improve on their own, biblical hope rests on God's sworn faithfulness—called an anchor for the soul in Hebrews 6:19.",
      },
      {
        q: "What verse encourages believers waiting long for change?",
        a: "Isaiah 40:31 promises that those who hope in the Lord will renew their strength, mount up like eagles, and walk without growing faint.",
      },
      {
        q: "How does reading community testimonies build hope?",
        a: "Hearing how God met others in sorrow, illness, or uncertainty reminds us that He remains actively compassionate in real lives today.",
      },
    ],
  },
  {
    slug: "healing",
    name: "Healing",
    category: "Healing",
    seoTitle: "Bible Verses & Devotionals for Healing",
    metaDescription:
      "Seek comfort in God's Word with healing scriptures, guided devotionals, and honest prayers for physical, emotional, and spiritual restoration.",
    headline: "Walking Gently Toward God's Restoration",
    intro:
      "Whether wounds are physical, relational, or buried deep in memory, the Lord draws close to bind up what feels fractured. Healing unfolds step by step in the safety of His compassion.",
    shortPrayer:
      "Healer and Shepherd, touch the aching places of my body, mind, and spirit with Your gentle grace. Sustain my patience while You restore strength from the inside out.",
    cover: "/assets/images/plans/healing-sunrise-forest.png",
    testimonyTags: ["Healing", "Hope", "Answered Prayer"],
    relatedSlugs: ["loss", "depression", "hope", "patience"],
    moodKey: "Grieving",
    faqs: [
      {
        q: "Does God care about emotional and inner wounds as well as physical pain?",
        a: "Yes; Psalm 147:3 proclaims that the Lord heals the brokenhearted and binds up their wounds, showing deep tender concern for whole-person restoration.",
      },
      {
        q: "How can I pray faithfully when recovery takes time?",
        a: "Combine honest lament from the Psalms with steady trust in God's companionship, inviting trusted believers to pray alongside you as James 5:14-16 encourages.",
      },
      {
        q: "Which passages offer comfort during medical or emotional recovery?",
        a: "Jeremiah 17:14, Psalm 23, and 2 Corinthians 12:9 remind sufferers both to ask boldly for healing and to lean on Christ's sufficient grace each day.",
      },
    ],
  },
  {
    slug: "fear",
    name: "Fear",
    category: "Fear",
    seoTitle: "Bible Verses & Devotionals for Overcoming Fear",
    metaDescription:
      "Stand firm in courage with Bible verses against fear, guided devotionals, and prayers grounded in God's protective presence.",
    headline: "Finding Courage When Fear Speaks Loudly",
    intro:
      "Scripture repeatedly pairs the command 'Do not fear' with the comforting reason 'For I am with you.' Courage grows not by denying real dangers, but by remembering Who walks beside us.",
    shortPrayer:
      "Almighty Refuge, replace my shrinking dread with steady confidence in Your nearness today. Hold my hand firmly wherever the road feels intimidating.",
    cover: "/assets/images/plans/fear-lighthouse-storm.png",
    testimonyTags: ["Strength", "Peace", "Hope"],
    relatedSlugs: ["anxiety", "doubt", "peace", "hope"],
    moodKey: "Anxious",
    faqs: [
      {
        q: "Why does the Bible say 'Do not fear' so many times?",
        a: "God knows human frailty and reminds His people across generations—from Isaiah 41:10 to Joshua 1:9—that His active presence outweighs every visible threat.",
      },
      {
        q: "What scripture helps right away in moments of sudden panic?",
        a: "Psalm 56:3 ('When I am afraid, I put my trust in you') gives a concise, honest prayer you can whisper immediately in any frightening moment.",
      },
      {
        q: "How does God's love cast out fear (1 John 4:18)?",
        a: "Knowing we are securely loved by the Father removes dread of rejection and empowers believers to step forward with love and self-discipline (2 Timothy 1:7).",
      },
    ],
  },
  {
    slug: "loss",
    name: "Loss",
    category: "Loss",
    seoTitle: "Bible Verses & Devotionals for Grief & Loss",
    metaDescription:
      "Walk through sorrow with tender Bible verses on grief, comfort devotionals, and honest prayers recognizing Jesus weeps with the grieving.",
    headline: "Held Close in Seasons of Grief & Loss",
    intro:
      "Grief honors what we loved deeply, and God never rushes sorrow into tidy clichés. Beside empty chairs and changed plans, Christ offers His own tears and promises morning light beyond darkness.",
    shortPrayer:
      "Compassionate Father, sit with me in the ache of what I miss today and catch every silent tear. Guard my bruised heart with the gentle promise of eternal reunion.",
    cover: "/assets/images/plans/loss-twilight-stars.png",
    testimonyTags: ["Healing", "Hope", "Peace"],
    relatedSlugs: ["healing", "depression", "hope", "love"],
    moodKey: "Grieving",
    faqs: [
      {
        q: "Is grieving deeply compatible with trusting God?",
        a: "Absolutely; John 11:35 shows Jesus Himself weeping at Lazarus' tomb, and 1 Thessalonians 4:13 says believers grieve honestly—only never without hope.",
      },
      {
        q: "Where in the Bible can I turn when words fail in sorrow?",
        a: "The Psalms of lament—especially Psalm 23, Psalm 34:18, and Psalm 42—give authentic language for tears while holding onto God's steadfast nearness.",
      },
      {
        q: "What promise points grieving believers toward future restoration?",
        a: "Revelation 21:4 promises a coming day when God Himself will wipe every tear away and death, mourning, and pain will cease forever.",
      },
    ],
  },
  {
    slug: "stress",
    name: "Stress",
    category: "Stress",
    seoTitle: "Bible Verses & Devotionals for Stress Relief",
    metaDescription:
      "Discover restful Bible verses for stress, devotional rhythms, and prayers that help overwhelmed hearts slow down in Christ's easy yoke.",
    headline: "Trading Burnout for Jesus' Gentle Rhythm",
    intro:
      "Constant urgency whispers that everything depends on your speed, yet Jesus invites tired shoulders into His unforced yoke. Slowing down with Scripture restores clarity and quiet endurance.",
    shortPrayer:
      "Lord of the Sabbath, lift the heavy pressure of deadlines and expectations off my shoulders today. Help me work faithfully from a place of rest rather than exhaustion.",
    cover: "/assets/images/plans/stress-quiet-sanctuary.png",
    testimonyTags: ["Peace", "Strength", "Patience"],
    relatedSlugs: ["anxiety", "peace", "patience", "depression"],
    moodKey: "Weary",
    faqs: [
      {
        q: "What did Jesus mean by 'my yoke is easy and my burden is light'?",
        a: "In Matthew 11:28-30, Jesus contrasts exhausting self-reliance with walking side-by-side in His grace, learning unhurried rhythms of trust and obedience.",
      },
      {
        q: "How can busy believers fit Scripture reading into packed days?",
        a: "Even five unhurried minutes with one short Psalm or verse reflection before opening work messages recalibrates priorities and lowers reactive stress.",
      },
      {
        q: "Does the Bible support setting healthy boundaries and rest?",
        a: "Yes; Jesus Himself regularly withdrew from demanding crowds to quiet places to pray (Luke 5:16), modeling sustainable ministry and rest.",
      },
    ],
  },
  {
    slug: "depression",
    name: "Depression",
    category: "Depression",
    seoTitle: "Bible Verses & Devotionals for Heavy Seasons",
    metaDescription:
      "Find gentle Bible verses for discouragement and dark valleys, accompanied by compassionate devotionals and prayers that meet you without judgment.",
    headline: "A Steady Light in the Darkest Valley",
    intro:
      "Heavy seasons can make even simple prayers feel exhausting, yet God's love does not weaken when your feelings grow numb. Even a whispered plea reaches a Father who never abandons His bruised reeds.",
    shortPrayer:
      "Faithful Shepherd, stay near when joy feels distant and energy runs thin today. Carry what I cannot lift alone and gently kindle fresh light in my spirit.",
    cover: "/assets/images/plans/depression-candle-sanctuary.png",
    testimonyTags: ["Hope", "Healing", "Strength"],
    relatedSlugs: ["hope", "loss", "healing", "doubt"],
    moodKey: "Weary",
    faqs: [
      {
        q: "Did faithful people in the Bible ever battle deep discouragement?",
        a: "Yes; prophets and psalmists like Elijah (1 Kings 19) and David (Psalm 42) cried out in profound heaviness, and God met them with rest, nourishment, and gentle assurance.",
      },
      {
        q: "How does God respond when I feel too tired to pray long prayers?",
        a: "Romans 8:26 assures us that the Spirit intercedes through wordless groans, and Psalm 34:18 affirms that the Lord stays close to the crushed in spirit.",
      },
      {
        q: "Can faith and professional care work together during depression?",
        a: "Yes; wise Christian community encourages pairing spiritual care, honest fellowship, and Scripture with trusted medical or counseling support without stigma.",
      },
    ],
  },
  {
    slug: "love",
    name: "Love",
    category: "Love",
    seoTitle: "Bible Verses & Devotionals on God's Love",
    metaDescription:
      "Reflect on Scripture passages about Christ's steadfast love, loving neighbors well, and building grace-filled relationships through devotionals.",
    headline: "Abiding in Love That Never Fails",
    intro:
      "Every genuine expression of patience, kindness, and forgiveness begins with knowing how deeply God already loves us. Receiving His steadfast affection equips us to love others without exhaustion.",
    shortPrayer:
      "Gracious Father, ground my identity in the length and depth of Christ's love for me today. Pour Your patient compassion through my words and actions toward everyone I meet.",
    cover: "/assets/images/plans/love-lanterns.png",
    testimonyTags: ["Love", "Gratitude", "Joy"],
    relatedSlugs: ["joy", "patience", "gratitude", "anger"],
    moodKey: "Joyful",
    faqs: [
      {
        q: "How does the Bible define authentic love beyond mere emotion?",
        a: "1 Corinthians 13 describes love as patient, kind, humble, forgiving, and enduring—rooted in active self-giving modeled supremely at the cross of Christ.",
      },
      {
        q: "What verses reassure me when I feel unlovable or unworthy?",
        a: "Romans 8:38-39 and Zephaniah 3:17 remind believers that nothing can separate us from God's love and that He delights over His people with singing.",
      },
      {
        q: "How can I show Christlike love toward difficult people?",
        a: "Ephesians 4:32 calls us to kindness and forgiveness rooted in remembering how freely God forgave us first, pairing grace with wise boundaries.",
      },
    ],
  },
  {
    slug: "joy",
    name: "Joy",
    category: "Joy",
    seoTitle: "Bible Verses & Devotionals for Joy",
    metaDescription:
      "Celebrate lasting spiritual joy with uplifting Scriptures, guided devotional plans, and prayers anchored in God's presence across every season.",
    headline: "Discovering Strength in the Lord's Joy",
    intro:
      "Christian joy runs deeper than cheerful circumstances; it flows from knowing our names are held securely in God's grace. When we rejoice in the Lord, quiet gladness strengthens weak hands.",
    shortPrayer:
      "Giver of every good gift, restore the quiet joy of Your salvation within my heart today. Teach me to delight in Your presence more than passing applause or comfort.",
    cover: "/assets/images/plans/joy-sunlit-meadow.png",
    testimonyTags: ["Joy", "Gratitude", "Love"],
    relatedSlugs: ["gratitude", "love", "hope", "peace"],
    moodKey: "Joyful",
    faqs: [
      {
        q: "What is the difference between happiness and biblical joy?",
        a: "Happiness often rises and falls with outward events, while biblical joy is a fruit of the Spirit (Galatians 5:22) anchored in God's nearness and unchanging salvation.",
      },
      {
        q: "Why does Nehemiah 8:10 say 'the joy of the Lord is your strength'?",
        a: "Remembering God's covenant grace lifts weary guilt and restores courage to rebuild, serve, and persevere together in faith.",
      },
      {
        q: "How can gratitude daily awaken more joy?",
        a: "Psalm 118:24 turns ordinary mornings into celebration by recognizing each day as a deliberate gift crafted by God.",
      },
    ],
  },
  {
    slug: "patience",
    name: "Patience",
    category: "Patience",
    seoTitle: "Bible Verses & Devotionals for Patience",
    metaDescription:
      "Grow steady endurance in seasons of waiting with Bible verses on patience, gentle devotionals, and prayers for trusting God's timing.",
    headline: "Trusting God's Unhurried Timing",
    intro:
      "Waiting rooms and unanswered timelines stretch our patience, yet Scripture reminds us that God does quiet, essential root-work beneath the soil. Endurance matures character without rushing grace.",
    shortPrayer:
      "Patient Lord, steady my restless spirit whenever doors stay closed longer than I planned. Teach me to wait faithfully with active kindness and hope in Your wisdom.",
    cover: "/assets/images/plans/patience-seedling-dawn.png",
    testimonyTags: ["Patience", "Hope", "Gratitude"],
    relatedSlugs: ["hope", "anger", "stress", "doubt"],
    moodKey: "SeekingGuidance",
    faqs: [
      {
        q: "Is biblical patience passive waiting or active trust?",
        a: "In James 5:7-8 and Galatians 6:9, patience means steadily sowing good works and keeping heart while trusting God to bring harvest in His right time.",
      },
      {
        q: "What Scripture encourages waiting when prayers feel delayed?",
        a: "Psalm 27:14 and Lamentations 3:25-26 highlight that the Lord is good to those who wait quietly for His salvation and strengthens courageous hearts.",
      },
      {
        q: "How does patience protect everyday relationships?",
        a: "Proverbs 15:18 and Ephesians 4:2 show that slow, gentle patience calms escalating quarrels and honors people still growing in grace.",
      },
    ],
  },
  {
    slug: "anger",
    name: "Anger",
    category: "Anger",
    seoTitle: "Bible Verses & Devotionals for Overcoming Anger",
    metaDescription:
      "Learn healthy, grace-shaped self-control with Bible verses on anger, gentle devotional reflections, and prayers for peacemaking and forgiveness.",
    headline: "Answering Heat with Gentle Wisdom",
    intro:
      "Unchecked frustration scorches the very relationships we care to protect, yet God's Spirit offers slow-to-speak wisdom before hot words leave our lips. Honesty before God cools bitterness into peace.",
    shortPrayer:
      "Lord slow to anger and rich in mercy, guard my tongue and soften any bitterness taking root in me today. Help me pursue justice with humility and gentle strength.",
    cover: "/assets/images/plans/anger-calm-waters.png",
    testimonyTags: ["Peace", "Love", "Strength"],
    relatedSlugs: ["patience", "peace", "love", "pride"],
    moodKey: "SeekingGuidance",
    faqs: [
      {
        q: "Is feeling angry always a sin?",
        a: "Ephesians 4:26 ('In your anger do not sin') distinguishes honest moral hurt from destructive rage; Scripture warns against nursing resentment until bitterness rules.",
      },
      {
        q: "What practical advice does James 1:19 give for heated moments?",
        a: "James urges believers to be 'quick to hear, slow to speak, slow to anger,' creating space to listen carefully and pray before reacting.",
      },
      {
        q: "How can I release old resentment that keeps resurfacing?",
        a: "Bring hurt openly to God in prayer and remember Ephesians 4:32—choosing daily to forgive others just as Christ generously forgave us.",
      },
    ],
  },
  {
    slug: "doubt",
    name: "Doubt",
    category: "Doubt",
    seoTitle: "Bible Verses & Devotionals for Faith & Doubt",
    metaDescription:
      "Explore honest Bible verses for questions and doubt, thoughtful devotionals, and prayers inviting Jesus to meet wrestling hearts with truth.",
    headline: "Bringing Honest Questions Into the Light",
    intro:
      "Honest questions do not disqualify you from grace; Scripture welcomes sincere seekers who ask Jesus for deeper understanding. Bringing doubt into prayer turns lonely confusion into growing trust.",
    shortPrayer:
      "Lord, I believe—help my unbelief wherever mysteries feel heavy and answers seem slow. Steady my footsteps with enough light for the next faithful step.",
    cover: "/assets/images/plans/doubt-ancient-compass.png",
    testimonyTags: ["Hope", "Strength", "Patience"],
    relatedSlugs: ["hope", "fear", "patience", "anxiety"],
    moodKey: "SeekingGuidance",
    faqs: [
      {
        q: "How did Jesus treat disciples who wrestled with doubt?",
        a: "Notice Thomas in John 20 and the father in Mark 9:24 ('help my unbelief')—Jesus never mocked sincere doubts; He patiently offered presence, mercy, and evidence.",
      },
      {
        q: "What verses guide believers seeking clarity and wisdom?",
        a: "Proverbs 3:5-6 and James 1:5 promise generous wisdom from God whenever believers ask sincerely without pretending to have every detail figured out.",
      },
      {
        q: "Why does community matter when navigating spiritual questions?",
        a: "Jude 1:22 instructs the church to show mercy to those who doubt, walking beside them with patient Scripture and encouragement.",
      },
    ],
  },
  {
    slug: "temptation",
    name: "Temptation",
    category: "Temptation",
    seoTitle: "Bible Verses & Devotionals for Resisting Temptation",
    metaDescription:
      "Strengthen resolve with Bible verses on resisting temptation, practical devotionals, and prayers grounded in Christ's faithful way of escape.",
    headline: "Standing Firm on the Narrow Path of Grace",
    intro:
      "Being tempted is not defeat; it is the crossroads where we turn toward God's strength rather than momentary shortcuts. Because Jesus faced temptation too, He provides mercy and a way through.",
    shortPrayer:
      "Faithful Redeemer, sharpen my discernment to spot compromises early and run toward Your offered way of escape today. Renew my desire for what truly gives life.",
    cover: "/assets/images/plans/temptation-narrow-trail.png",
    testimonyTags: ["Strength", "Hope", "Answered Prayer"],
    relatedSlugs: ["pride", "anger", "jealousy", "patience"],
    moodKey: "SeekingGuidance",
    faqs: [
      {
        q: "What does 1 Corinthians 10:13 promise when temptation feels overwhelming?",
        a: "It assures believers that God is faithful, will never allow temptation beyond what His grace enables you to bear, and always provides a clear way of escape.",
      },
      {
        q: "Does Jesus understand what it feels like to be tempted?",
        a: "Yes; Hebrews 4:15 declares that our High Priest was tempted in every way we are—yet without sin—so we can approach His throne with confidence for timely help.",
      },
      {
        q: "How does daily Scripture help guard habits and choices?",
        a: "Psalm 119:11 teaches storing God's Word in the heart so truth is ready when pressure, fatigue, or isolation makes shortcuts look appealing.",
      },
    ],
  },
  {
    slug: "jealousy",
    name: "Jealousy",
    category: "Jealousy",
    seoTitle: "Bible Verses & Devotionals for Contentment Over Jealousy",
    metaDescription:
      "Overcome comparison and envy with Bible verses on contentment, heart-check devotionals, and prayers celebrating God's abundant care.",
    headline: "Freeing Your Heart From Comparison & Envy",
    intro:
      "Scrolling through someone else's harvest steals joy from the field God entrusted to you today. Contentment blossoms as we trust our Shepherd's individualized timing and celebrate others freely.",
    shortPrayer:
      "Generous Shepherd, guard my heart from silent comparison and bitter envy today. Teach me to rejoice warmly in others' blessings while resting in Your abundant care for me.",
    cover: "/assets/images/plans/jealousy-wildflower-field.png",
    testimonyTags: ["Gratitude", "Joy", "Love"],
    relatedSlugs: ["gratitude", "pride", "joy", "love"],
    moodKey: "Grateful",
    faqs: [
      {
        q: "Why does Scripture warn so strongly against envy?",
        a: "Proverbs 14:30 observes that a tranquil heart gives life to the flesh, whereas envy rots inner peace, fueling comparison, division, and ingratitude.",
      },
      {
        q: "How do I replace comparison with genuine contentment?",
        a: "Hebrews 13:5 roots contentment in God's unbroken promise 'Never will I leave you,' while gratitude trains your eyes to name today's gifts.",
      },
      {
        q: "How can praying for a peer dissolve jealousy?",
        a: "Romans 12:15 invites believers to rejoice with those who rejoice; intentionally blessing someone you envied aligns your heart with Christ's generosity.",
      },
    ],
  },
  {
    slug: "pride",
    name: "Pride",
    category: "Pride",
    seoTitle: "Bible Verses & Devotionals on Humility Over Pride",
    metaDescription:
      "Walk gently in Christlike humility with Bible verses on pride and grace, grounded devotionals, and prayers for teachable strength.",
    headline: "Walking Gently in the Freedom of Humility",
    intro:
      "Pride exhausts us with image management and defensiveness, while Jesus invites us into the quiet freedom of humility. Knowing we stand purely by grace frees us to serve joyfully and stay teachable.",
    shortPrayer:
      "Humble King, strip away noisy self-importance and defensiveness in my heart today. Teach me to walk kindly, listen eagerly, and point praise back to Your grace alone.",
    cover: "/assets/images/plans/pride-humble-valley.png",
    testimonyTags: ["Strength", "Love", "Peace"],
    relatedSlugs: ["anger", "jealousy", "temptation", "love"],
    moodKey: "SeekingGuidance",
    faqs: [
      {
        q: "How does the Bible describe true humility?",
        a: "In Philippians 2:3-8, humility is not self-hatred; it is forgetting anxious self-promotion to care genuinely for others, following Jesus' own servant heart.",
      },
      {
        q: "Why does James 4:6 say God gives grace to the humble?",
        a: "Self-sufficiency closes the door to help, whereas humility opens empty hands to receive God's mercy, wisdom, and steady lifting.",
      },
      {
        q: "What passage sums up the humble posture God desires?",
        a: "Micah 6:8 captures it concisely: act justly, love mercy, and walk humbly with your God.",
      },
    ],
  },
];

const TOPIC_KEYWORDS = {
  gratitude: ["thank", "thanksgiving", "grateful", "praise", "blessing", "mercy"],
  anxiety: ["anxious", "anxiety", "cares", "worry", "afraid", "peace", "troubled"],
  peace: ["peace", "still", "rest", "calm", "shepherd", "quiet", "refuge"],
  hope: ["hope", "future", "faith", "trust", "morning", "light", "renew"],
  healing: ["heal", "bind", "mercy", "strength", "restore", "weak", "grace"],
  fear: ["fear", "afraid", "courage", "dismayed", "refuge", "fortress", "strong"],
  loss: ["valley", "weep", "tears", "comfort", "mourn", "brokenhearted", "refuge"],
  stress: ["rest", "labor", "heavy", "weary", "wait", "strength", "still"],
  depression: ["light", "darkness", "hope", "refuge", "faint", "mercies", "cry"],
  love: ["love", "kind", "forgiv", "compassion", "mercy", "faithful"],
  joy: ["joy", "rejoice", "glad", "delight", "sing", "praise"],
  patience: ["wait", "endure", "steadfast", "harvest", "weary", "faithful", "path"],
  anger: ["anger", "slow", "forgiv", "kind", "peace", "humbl", "gentle"],
  doubt: ["wisdom", "counsel", "trust", "faith", "guide", "ask", "understanding"],
  temptation: ["tempt", "guard", "escape", "righteous", "pure", "discipline", "shield"],
  jealousy: ["content", "treasure", "thank", "good", "love", "humbl", "kind"],
  pride: ["humbl", "justly", "mercy", "grace", "servant", "boast", "wise"],
};

function stripTranslationSuffix(ref) {
  return String(ref || "")
    .trim()
    .replace(/\s+(?:NIV|ESV|KJV|NKJV|NLT|CSB|NASB|WEB|BBE|ASV)$/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildBibleHref(reference) {
  const parsed = parseBibleReference(reference);
  if (!parsed) return "/bible";
  return `/bible?book=${encodeURIComponent(parsed.book)}&chapter=${parsed.chapter}${
    parsed.verse ? `&verse=${parsed.verse}` : ""
  }`;
}

export function getTopicBySlug(slug) {
  if (typeof slug !== "string") return null;
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;
  return TOPICS.find((topic) => topic.slug.toLowerCase() === clean) || null;
}

export function getTopicScriptures(topic, matchingPlans = []) {
  if (!topic) return [];

  const results = [];
  const seen = new Set();

  const tryAdd = (verseText, rawReference) => {
    if (results.length >= 9) return false;
    const verse = String(verseText || "").trim();
    const reference = String(rawReference || "").trim();
    if (!verse || !reference) return false;

    const key = stripTranslationSuffix(reference);
    if (!key || seen.has(key)) return false;

    seen.add(key);
    results.push({
      verse,
      reference,
      bibleHref: buildBibleHref(reference),
    });
    return true;
  };

  // 1. Pull scriptures directly from matching devotional plans (capping plan slice so mood/curated verses also shine)
  if (Array.isArray(matchingPlans)) {
    let addedFromPlans = 0;
    for (const plan of matchingPlans) {
      if (addedFromPlans >= 5 || results.length >= 8) break;
      const days = Array.isArray(plan?.days) ? plan.days : [];
      let perPlanCount = 0;
      for (const day of days) {
        if (perPlanCount >= 2 || addedFromPlans >= 5 || results.length >= 8) break;
        if (tryAdd(day?.verseText, day?.verseTag)) {
          perPlanCount++;
          addedFromPlans++;
        }
      }
    }
  }

  // 2. Resolve MOOD_TAGS entries matching topic.moodKey against curated verses
  if (topic.moodKey && Array.isArray(MOOD_TAGS[topic.moodKey])) {
    for (const moodRef of MOOD_TAGS[topic.moodKey]) {
      if (results.length >= 9) break;
      const match = verses.find((item) => item.tag && item.tag.includes(moodRef));
      if (match) {
        tryAdd(match.verse, match.tag);
      }
    }
  }

  // 3. Keyword search backup across curated verses to ensure rich topical coverage
  if (results.length < 7) {
    const keywords = TOPIC_KEYWORDS[topic.slug] || [topic.name.toLowerCase()];
    for (const item of verses) {
      if (results.length >= 8) break;
      const hay = `${item.verse} ${item.tag}`.toLowerCase();
      if (keywords.some((kw) => hay.includes(kw))) {
        tryAdd(item.verse, item.tag);
      }
    }
  }

  // 4. Final ordered curated fallback guarantee (6-9 entries even if matchingPlans is empty)
  if (results.length < 6) {
    for (const item of verses) {
      if (results.length >= 6) break;
      tryAdd(item.verse, item.tag);
    }
  }

  return results.slice(0, 9);
}
