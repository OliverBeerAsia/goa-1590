import Phaser from 'phaser';

/**
 * DialogueSystem - Manages conversations and interactions with NPCs
 * 
 * Dialogue reflects the multicultural nature of 16th century Goa,
 * with Portuguese, Hindu, and Arab characters speaking in their
 * characteristic styles.
 */

interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  responses?: DialogueResponse[];
  next?: string; // Next node ID if no responses
  effects?: DialogueEffect[];
}

interface DialogueResponse {
  text: string;
  nextNode?: string;
  condition?: () => boolean;
  effects?: DialogueEffect[];
}

interface DialogueEffect {
  type: 'gold' | 'reputation' | 'item' | 'flag';
  value: number | string | boolean;
  target?: string;
}

interface DialogueTree {
  id: string;
  startNode: string;
  nodes: Map<string, DialogueNode>;
}

export class DialogueSystem {
  private scene: Phaser.Scene;
  private dialogueTrees: Map<string, DialogueTree> = new Map();
  private currentTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  private dialogueContainer: Phaser.GameObjects.Container | null = null;
  private isActive = false;

  // NPC type to dialogue tree mapping - all NPC types
  private readonly npcDialogues: { [key: string]: string } = {
    'npc_portuguese': 'portuguese_merchant',
    'npc_hindu': 'hindu_trader',
    'npc_arab': 'arab_middleman',
    'npc_official': 'crown_official',
    'npc_sailor': 'sailor',
    'npc_monk': 'franciscan_monk',
    'npc_soldier': 'portuguese_soldier',
    'npc_porter': 'dock_porter',
  };

  // Time-based greetings
  private readonly timeGreetings: { [period: string]: string[] } = {
    'Early Morning': ['You are up early!', 'The day has just begun.', 'Dawn breaks over Goa.'],
    'Market Hours': ['Good morning!', 'A fine morning for trade!', 'The market is bustling!'],
    'Morning': ['Good day!', 'How goes your morning?', 'Business is good today.'],
    'Afternoon': ['The afternoon heat is fierce.', 'Rest well during siesta.', 'Too hot to work...'],
    'Evening': ['Good evening!', 'The evening brings relief.', 'Trade resumes as it cools.'],
    'Night': ['Late night dealings?', 'The market is closed.', 'Be careful at night.'],
  };

  // Reputation-based greetings
  private readonly reputationGreetings: { [level: string]: string[] } = {
    'hostile': ['What do YOU want?', 'I have nothing for the likes of you.', '*scowls*'],
    'unfriendly': ['Hmph. State your business.', 'Make it quick.', 'I am busy.'],
    'neutral': ['Yes?', 'How may I help you?', 'Welcome, stranger.'],
    'friendly': ['Ah, good to see you!', 'Welcome, friend!', 'A pleasure as always.'],
    'honored': ['My honored friend!', 'Your reputation precedes you!', 'An honor to serve you.'],
    'trusted': ['My dear friend!', 'For you, anything!', 'Welcome, welcome!'],
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeDialogueTrees();
  }

  private initializeDialogueTrees(): void {
    // Portuguese Merchant dialogue
    this.createDialogueTree('portuguese_merchant', [
      {
        id: 'start',
        speaker: 'Portuguese Merchant',
        text: 'Bom dia, senhor! Welcome to my humble establishment. The finest goods from Lisboa and beyond!',
        responses: [
          { text: 'What do you have for sale?', nextNode: 'show_goods' },
          { text: 'Tell me about the trade routes.', nextNode: 'trade_routes' },
          { text: 'Good day. (Leave)', nextNode: 'end' },
        ],
      },
      {
        id: 'show_goods',
        speaker: 'Portuguese Merchant',
        text: 'Ah, a discerning buyer! I have silk from Macau, porcelain from the Middle Kingdom, and the finest cinnamon from Ceylon. The carrack just arrived last week!',
        responses: [
          { text: 'I would like to trade.', nextNode: 'trade' },
          { text: 'Those prices seem high...', nextNode: 'haggle' },
          { text: 'Perhaps another time.', nextNode: 'end' },
        ],
      },
      {
        id: 'trade_routes',
        speaker: 'Portuguese Merchant',
        text: 'The Carreira da Índia connects Lisboa to Goa - six months each way! We bring silver and coral, and return with spices worth their weight in gold. Well, almost!',
        responses: [
          { text: 'Fascinating. What do you have for sale?', nextNode: 'show_goods' },
          { text: 'Thank you for the information.', nextNode: 'end' },
        ],
      },
      {
        id: 'haggle',
        speaker: 'Portuguese Merchant',
        text: 'High? Senhor, do you know the dangers of the Cape of Good Hope? The storms, the pirates, the scurvy? These prices reflect the risk! ...But perhaps for a regular customer, a small discount.',
        effects: [{ type: 'flag', value: true, target: 'portuguese_discount' }],
        responses: [
          { text: 'Very well, let us trade.', nextNode: 'trade' },
          { text: 'I will think about it.', nextNode: 'end' },
        ],
      },
      {
        id: 'trade',
        speaker: 'System',
        text: '[Trade interface opens]',
        next: 'end',
      },
      {
        id: 'end',
        speaker: 'Portuguese Merchant',
        text: 'Até logo, senhor! May God speed your ventures!',
      },
    ]);

    // Hindu Trader dialogue
    this.createDialogueTree('hindu_trader', [
      {
        id: 'start',
        speaker: 'Hindu Trader',
        text: 'Namaste, traveler! I am Venkatesh, third generation spice merchant. My family has traded on this coast since before the Portuguese came.',
        responses: [
          { text: 'What spices do you sell?', nextNode: 'spices' },
          { text: 'How has the Portuguese rule affected your trade?', nextNode: 'politics' },
          { text: 'Namaste. (Leave)', nextNode: 'end' },
        ],
      },
      {
        id: 'spices',
        speaker: 'Hindu Trader',
        text: 'The finest pepper from the Malabar coast! Cardamom, turmeric, and ginger too. My brother travels to the source and brings only the best. The Portuguese buy from me to fill their ships!',
        responses: [
          { text: 'I wish to purchase some.', nextNode: 'trade' },
          { text: 'How do prices compare to last year?', nextNode: 'prices' },
          { text: 'Impressive. I must go now.', nextNode: 'end' },
        ],
      },
      {
        id: 'politics',
        speaker: 'Hindu Trader',
        text: 'The Inquisition... it is difficult. Many have converted, some by choice, some by force. We who remain Hindu must be careful. But trade continues - gold knows no religion!',
        responses: [
          { text: 'I understand. Let us focus on trade.', nextNode: 'spices' },
          { text: 'I am sorry to hear that.', nextNode: 'end' },
        ],
      },
      {
        id: 'prices',
        speaker: 'Hindu Trader',
        text: 'The monsoon was good this year, so pepper is plentiful. But cloves? The Dutch are making trouble in the Moluccas, so those are harder to come by. Buy them while you can!',
        responses: [
          { text: 'Good advice. Let us trade.', nextNode: 'trade' },
          { text: 'Thank you for the tip.', nextNode: 'end' },
        ],
      },
      {
        id: 'trade',
        speaker: 'System',
        text: '[Trade interface opens]',
        next: 'end',
      },
      {
        id: 'end',
        speaker: 'Hindu Trader',
        text: 'Shubh yatra! Safe travels, friend!',
      },
    ]);

    // Arab Middleman dialogue
    this.createDialogueTree('arab_middleman', [
      {
        id: 'start',
        speaker: 'Arab Middleman',
        text: 'As-salamu alaykum! I am Hassan, from Hormuz. I deal in rarities that others cannot find. Interested?',
        responses: [
          { text: 'What rarities do you speak of?', nextNode: 'rarities' },
          { text: 'How did you come to Goa?', nextNode: 'story' },
          { text: 'Peace be upon you. (Leave)', nextNode: 'end' },
        ],
      },
      {
        id: 'rarities',
        speaker: 'Arab Middleman',
        text: 'Cloves from the Moluccas, before the Portuguese take their cut! Incense from Arabia, pearls from the Gulf. I have connections the firangis do not know about.',
        responses: [
          { text: 'That sounds... unofficial.', nextNode: 'unofficial' },
          { text: 'Show me what you have.', nextNode: 'trade' },
          { text: 'Too risky for me.', nextNode: 'end' },
        ],
      },
      {
        id: 'unofficial',
        speaker: 'Arab Middleman',
        text: 'Unofficial? The sea belongs to Allah, not to any king! But I understand your caution. My goods are real, my prices fair. The only risk is in the quality - which I guarantee!',
        responses: [
          { text: 'Very well, show me.', nextNode: 'trade' },
          { text: 'I will consider it.', nextNode: 'end' },
        ],
      },
      {
        id: 'story',
        speaker: 'Arab Middleman',
        text: 'My family has sailed these waters for generations, long before Vasco da Gama "discovered" what we already knew! Goa is the crossroads of the world. Money flows here like the tide.',
        responses: [
          { text: 'Indeed. What do you have for sale?', nextNode: 'rarities' },
          { text: 'Fascinating history.', nextNode: 'end' },
        ],
      },
      {
        id: 'trade',
        speaker: 'System',
        text: '[Trade interface opens]',
        next: 'end',
      },
      {
        id: 'end',
        speaker: 'Arab Middleman',
        text: 'Ma\'a salama! Until we meet again, inshallah!',
      },
    ]);

    // Crown Official dialogue
    this.createDialogueTree('crown_official', [
      {
        id: 'start',
        speaker: 'Crown Trade Officer',
        text: 'Halt! I am the representative of His Majesty in these matters of trade. All goods must be properly taxed and documented.',
        responses: [
          { text: 'What taxes apply to my goods?', nextNode: 'taxes' },
          { text: 'I have proper documentation.', nextNode: 'papers' },
          { text: 'Good day, sir. (Leave)', nextNode: 'end' },
        ],
      },
      {
        id: 'taxes',
        speaker: 'Crown Trade Officer',
        text: 'The Crown takes its due share - typically one-fifth on spices, less on common goods. The Casa da Índia in Lisboa oversees all.',
        responses: [
          { text: 'I understand. Thank you.', nextNode: 'end' },
        ],
      },
      {
        id: 'papers',
        speaker: 'Crown Trade Officer',
        text: 'Good. See that you maintain proper records. The Alfândega inspectors are thorough, and smuggling carries... severe penalties.',
        responses: [
          { text: 'Of course. Good day.', nextNode: 'end' },
        ],
      },
      {
        id: 'end',
        speaker: 'Crown Trade Officer',
        text: 'Go about your business. And remember - the Crown sees all.',
      },
    ]);

    // Sailor dialogue
    this.createDialogueTree('sailor', [
      {
        id: 'start',
        speaker: 'Sailor',
        text: '*spits* Just got off the carrack from Lisboa. Six months at sea, and I need a drink! You trading or just looking?',
        responses: [
          { text: 'Where did you sail from?', nextNode: 'voyage' },
          { text: 'Any news from Portugal?', nextNode: 'news' },
          { text: 'Good luck finding that drink.', nextNode: 'end' },
        ],
      },
      {
        id: 'voyage',
        speaker: 'Sailor',
        text: 'Lisboa to Goa via the Cape of Good Hope. Lost three men to scurvy, two to a storm. The usual, really.',
        responses: [
          { text: 'Sounds dangerous.', nextNode: 'danger' },
          { text: 'I should let you go.', nextNode: 'end' },
        ],
      },
      {
        id: 'news',
        speaker: 'Sailor',
        text: 'King Philip still rules both Portugal and Spain. Trade is good. War with the Dutch brewing. Same old story.',
        responses: [
          { text: 'Thank you for the news.', nextNode: 'end' },
        ],
      },
      {
        id: 'danger',
        speaker: 'Sailor',
        text: 'Every voyage is. But the pay is worth it - if you survive.',
        next: 'end',
      },
      {
        id: 'end',
        speaker: 'Sailor',
        text: 'Right. Now where\'s that tavern...',
      },
    ]);

    // Franciscan Monk dialogue
    this.createDialogueTree('franciscan_monk', [
      {
        id: 'start',
        speaker: 'Franciscan Monk',
        text: 'Peace be with you, my child. I am Brother Tomás of the Order of Saint Francis. How may I help you on this blessed day?',
        responses: [
          { text: 'Tell me about the cathedral.', nextNode: 'cathedral' },
          { text: 'What is your mission here?', nextNode: 'mission' },
          { text: 'Blessings to you, Father.', nextNode: 'end' },
        ],
      },
      {
        id: 'cathedral',
        speaker: 'Franciscan Monk',
        text: 'The Sé Cathedral rises slowly but surely. It will be the grandest church in all of Asia - a testament to God\'s glory in these lands.',
        responses: [
          { text: 'A noble endeavor.', nextNode: 'end' },
        ],
      },
      {
        id: 'mission',
        speaker: 'Franciscan Monk',
        text: 'We bring the light of Christ to these shores. The Jesuits focus on the learned, but we Franciscans serve the poor and humble.',
        responses: [
          { text: 'God\'s work indeed.', nextNode: 'end' },
        ],
      },
      {
        id: 'end',
        speaker: 'Franciscan Monk',
        text: 'Go with God, my child. May He guide your steps.',
      },
    ]);

    // Portuguese Soldier dialogue
    this.createDialogueTree('portuguese_soldier', [
      {
        id: 'start',
        speaker: 'Portuguese Guard',
        text: '*adjusts helmet* Move along, citizen. I am here to keep the peace and protect Crown interests. No trouble today.',
        responses: [
          { text: 'Is the market safe?', nextNode: 'safety' },
          { text: 'Any threats to worry about?', nextNode: 'threats' },
          { text: 'Understood. I\'ll be going.', nextNode: 'end' },
        ],
      },
      {
        id: 'safety',
        speaker: 'Portuguese Guard',
        text: 'Safe enough, if you keep to yourself. Pickpockets work these crowds. Guard your purse.',
        responses: [
          { text: 'I\'ll be careful.', nextNode: 'end' },
        ],
      },
      {
        id: 'threats',
        speaker: 'Portuguese Guard',
        text: 'Dutch privateers off the coast. Rumors of local unrest. Nothing the garrison can\'t handle.',
        responses: [
          { text: 'Good to know.', nextNode: 'end' },
        ],
      },
      {
        id: 'end',
        speaker: 'Portuguese Guard',
        text: 'Stay out of trouble.',
      },
    ]);

    // Dock Porter dialogue
    this.createDialogueTree('dock_porter', [
      {
        id: 'start',
        speaker: 'Porter',
        text: '*wipes sweat* Heavy loads today. You need cargo moved? I can carry anything for the right price.',
        responses: [
          { text: 'What ships have come in?', nextNode: 'ships' },
          { text: 'How is business?', nextNode: 'business' },
          { text: 'Not today, thank you.', nextNode: 'end' },
        ],
      },
      {
        id: 'ships',
        speaker: 'Porter',
        text: 'Big carrack from Lisboa yesterday. Full of silver and cloth. Also a dhow from Hormuz with perfumes.',
        responses: [
          { text: 'Interesting. Thank you.', nextNode: 'end' },
        ],
      },
      {
        id: 'business',
        speaker: 'Porter',
        text: 'When ships come, we eat. When monsoon stops the trade, we go hungry. Such is life.',
        responses: [
          { text: 'May the winds be kind.', nextNode: 'end' },
        ],
      },
      {
        id: 'end',
        speaker: 'Porter',
        text: 'Back to work for me. The cargo won\'t move itself!',
      },
    ]);
  }

  private createDialogueTree(id: string, nodes: DialogueNode[]): void {
    const tree: DialogueTree = {
      id,
      startNode: nodes[0].id,
      nodes: new Map(),
    };

    for (const node of nodes) {
      tree.nodes.set(node.id, node);
    }

    this.dialogueTrees.set(id, tree);
  }

  public startDialogue(npcType: string, npcName: string, npcId?: string): void {
    const treeId = this.npcDialogues[npcType];
    if (!treeId) {
      console.warn(`No dialogue tree for NPC type: ${npcType}`);
      return;
    }

    const tree = this.dialogueTrees.get(treeId);
    if (!tree) {
      console.warn(`Dialogue tree not found: ${treeId}`);
      return;
    }

    this.currentTree = tree;

    // Get context for conditional dialogue
    const context = this.getDialogueContext(npcId);

    // Modify start node text based on context
    const startNode = tree.nodes.get(tree.startNode);
    if (startNode) {
      const modifiedNode = this.applyConditionalDialogue(startNode, context, npcName);
      this.currentNode = modifiedNode;
    } else {
      this.currentNode = null;
    }

    this.isActive = true;

    this.showDialogueUI();
    this.displayCurrentNode();
  }

  /**
   * Get context for conditional dialogue
   */
  private getDialogueContext(npcId?: string): {
    timeOfDay: string;
    reputation: string;
    attitude: string;
    interactionCount: number;
    tradeCount: number;
  } {
    let timeOfDay = 'Morning';
    let reputation = 'neutral';
    let attitude = 'neutral';
    let interactionCount = 0;
    let tradeCount = 0;

    // Get time of day
    try {
      const marketScene = this.scene.scene.get('MarketScene') as any;
      if (marketScene?.getTimeSystem) {
        timeOfDay = marketScene.getTimeSystem().getCurrentPeriod();
      }
    } catch (e) {
      // Use default
    }

    // Get NPC memory if available
    const npcMemory = this.scene.registry.get('npcMemorySystem');
    if (npcMemory && npcId) {
      attitude = npcMemory.getAttitudeLevelForNPC?.(npcId) || 'neutral';
      interactionCount = npcMemory.getInteractionCount?.(npcId) || 0;
      const history = npcMemory.getTradeHistory?.(npcId);
      tradeCount = history?.total || 0;
    }

    // Get faction reputation for NPC's faction
    const factionSystem = this.scene.registry.get('factionSystem');
    if (factionSystem && npcId) {
      const npcFaction = factionSystem.getNPCFaction?.(npcId);
      if (npcFaction) {
        reputation = factionSystem.getReputationLevel?.(npcFaction) || 'neutral';
      }
    }

    return { timeOfDay, reputation, attitude, interactionCount, tradeCount };
  }

  /**
   * Apply conditional modifications to dialogue based on context
   */
  private applyConditionalDialogue(
    node: DialogueNode,
    context: {
      timeOfDay: string;
      reputation: string;
      attitude: string;
      interactionCount: number;
      tradeCount: number;
    },
    npcName: string
  ): DialogueNode {
    // Clone the node to avoid modifying the original
    const modifiedNode: DialogueNode = { ...node };

    // Build greeting based on context
    let greeting = '';

    // Add time-based greeting
    const timeGreetings = this.timeGreetings[context.timeOfDay];
    if (timeGreetings) {
      greeting = timeGreetings[Math.floor(Math.random() * timeGreetings.length)] + ' ';
    }

    // Add reputation-based greeting based on NPC attitude or faction reputation
    const repLevel = context.attitude !== 'neutral' ? context.attitude : context.reputation;
    const repGreetings = this.reputationGreetings[repLevel];
    if (repGreetings && context.interactionCount > 0) {
      // Only use reputation greetings for returning visitors
      greeting = repGreetings[Math.floor(Math.random() * repGreetings.length)] + ' ';
    }

    // Add returning customer recognition
    if (context.interactionCount > 5 && context.attitude !== 'hostile' && context.attitude !== 'unfriendly') {
      const returningLines = [
        `Ah, I remember you! `,
        `Back again, I see. `,
        `Welcome back! `,
        `Good to see you again! `,
      ];
      greeting += returningLines[Math.floor(Math.random() * returningLines.length)];
    }

    // Add trade count recognition
    if (context.tradeCount >= 10 && context.attitude !== 'hostile') {
      const tradeLines = [
        `You've been a good customer. `,
        `Our dealings have been profitable. `,
        `I value our trade relationship. `,
      ];
      greeting += tradeLines[Math.floor(Math.random() * tradeLines.length)];
    }

    // Modify the node text
    if (greeting) {
      modifiedNode.text = greeting + modifiedNode.text;
    }

    // Modify speaker to include actual NPC name if different
    if (npcName && modifiedNode.speaker !== 'System') {
      modifiedNode.speaker = npcName;
    }

    return modifiedNode;
  }

  private showDialogueUI(): void {
    if (this.dialogueContainer) {
      this.dialogueContainer.destroy();
    }

    // Use screen dimensions directly - dialogue is a UI element
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // Account for UIScene bottomBar (52px) plus margin
    const uiBottomBarHeight = 60;

    // Box dimensions in screen pixels
    const margin = 20;
    const boxWidth = screenWidth - (margin * 2);
    const boxHeight = 120;
    const boxX = margin;
    const boxY = screenHeight - boxHeight - uiBottomBarHeight;

    // Create container - use a dedicated UI camera approach
    // Position at screen coordinates
    this.dialogueContainer = this.scene.add.container(0, 0);
    this.dialogueContainer.setDepth(10000);

    // Background rectangle positioned at screen coordinates
    const bgRect = this.scene.add.rectangle(
      boxX + boxWidth / 2,
      boxY + boxHeight / 2,
      boxWidth,
      boxHeight,
      0x2c1810,
      0.95
    );
    bgRect.setStrokeStyle(2, 0x8b4513, 1);
    bgRect.setScrollFactor(0);
    this.dialogueContainer.add(bgRect);

    // Store dimensions and offset for text positioning
    this.dialogueContainer.setData('boxWidth', boxWidth);
    this.dialogueContainer.setData('boxHeight', boxHeight);
    this.dialogueContainer.setData('boxX', boxX);
    this.dialogueContainer.setData('boxY', boxY);

    // Add ESC key handler to close dialogue
    this.scene.input.keyboard?.on('keydown-ESC', this.handleEscKey, this);
  }

  private handleEscKey(): void {
    if (this.isActive) {
      this.endDialogue();
    }
  }

  private displayCurrentNode(): void {
    if (!this.currentNode || !this.dialogueContainer) return;

    // Clear previous content (except background at index 0)
    const children = this.dialogueContainer.getAll();
    for (let i = children.length - 1; i >= 1; i--) {
      children[i].destroy();
    }

    const boxWidth = this.dialogueContainer.getData('boxWidth') || 300;
    const boxX = this.dialogueContainer.getData('boxX') || 20;
    const boxY = this.dialogueContainer.getData('boxY') || 400;

    // Fixed font sizes in screen pixels
    const speakerSize = 16;
    const textSize = 14;
    const padding = 12;
    const lineSpacing = 6;

    // Speaker name highlight bar
    const speakerBgHeight = speakerSize + 8;
    const speakerBg = this.scene.add.rectangle(
      boxX + boxWidth / 2,
      boxY + padding + speakerBgHeight / 2 - 2,
      boxWidth,
      speakerBgHeight,
      0xc9a227,
      0.2
    );
    speakerBg.setScrollFactor(0);
    this.dialogueContainer.add(speakerBg);

    // Speaker name
    const speakerText = this.scene.add.text(boxX + padding, boxY + padding, this.currentNode.speaker, {
      fontFamily: 'Georgia, serif',
      fontSize: `${speakerSize}px`,
      color: '#FFD700',
      fontStyle: 'bold',
    });
    speakerText.setScrollFactor(0);
    this.dialogueContainer.add(speakerText);

    // Dialogue text
    const dialogueText = this.scene.add.text(
      boxX + padding,
      boxY + padding + speakerSize + lineSpacing,
      this.currentNode.text,
      {
        fontFamily: 'Georgia, serif',
        fontSize: `${textSize}px`,
        color: '#F5E6D3',
        wordWrap: { width: boxWidth - padding * 2 },
        lineSpacing: lineSpacing / 2,
      }
    );
    dialogueText.setScrollFactor(0);
    this.dialogueContainer.add(dialogueText);

    // Responses or continue prompt
    if (this.currentNode.responses && this.currentNode.responses.length > 0) {
      this.displayResponses(this.currentNode.responses);
    } else if (this.currentNode.next) {
      this.displayContinuePrompt(this.currentNode.next);
    } else {
      this.displayEndPrompt();
    }
  }

  private displayResponses(responses: DialogueResponse[]): void {
    if (!this.dialogueContainer) return;

    const boxWidth = this.dialogueContainer.getData('boxWidth') || 300;
    const boxHeight = this.dialogueContainer.getData('boxHeight') || 120;
    const boxX = this.dialogueContainer.getData('boxX') || 20;
    const boxY = this.dialogueContainer.getData('boxY') || 400;

    const responseSize = 12;
    const padding = 12;
    const responseSpacing = 20;

    // Start responses at 50% down the box
    let yOffset = boxY + boxHeight * 0.5;

    responses.forEach((response, index) => {
      // Check condition if present
      if (response.condition && !response.condition()) return;

      const responseText = this.scene.add.text(
        boxX + padding + 8,
        yOffset,
        `${index + 1}. ${response.text}`,
        {
          fontFamily: 'Georgia, serif',
          fontSize: `${responseSize}px`,
          color: '#C19A6B',
          wordWrap: { width: boxWidth - padding * 2 - 16 },
        }
      );
      responseText.setScrollFactor(0);
      responseText.setInteractive({ useHandCursor: true });

      responseText.on('pointerover', () => {
        responseText.setColor('#FFD700');
      });

      responseText.on('pointerout', () => {
        responseText.setColor('#C19A6B');
      });

      responseText.on('pointerdown', () => {
        this.selectResponse(response);
      });

      // Keyboard shortcut
      this.scene.input.keyboard?.once(`keydown-${index + 1}`, () => {
        this.selectResponse(response);
      });

      this.dialogueContainer!.add(responseText);

      // Calculate actual text height for proper spacing
      yOffset += Math.max(responseSpacing, responseText.height + 4);
    });
  }

  private displayContinuePrompt(nextNodeId: string): void {
    if (!this.dialogueContainer) return;

    const boxHeight = this.dialogueContainer.getData('boxHeight') || 120;
    const boxX = this.dialogueContainer.getData('boxX') || 20;
    const boxY = this.dialogueContainer.getData('boxY') || 400;

    const promptSize = 10;
    const padding = 12;

    const continueText = this.scene.add.text(
      boxX + padding,
      boxY + boxHeight - 18,
      '[Press SPACE to continue]',
      {
        fontFamily: 'Georgia, serif',
        fontSize: `${promptSize}px`,
        color: '#888888',
        fontStyle: 'italic',
      }
    );
    continueText.setScrollFactor(0);
    this.dialogueContainer.add(continueText);

    this.scene.input.keyboard?.once('keydown-SPACE', () => {
      this.advanceToNode(nextNodeId);
    });
  }

  private displayEndPrompt(): void {
    if (!this.dialogueContainer) return;

    const boxHeight = this.dialogueContainer.getData('boxHeight') || 120;
    const boxX = this.dialogueContainer.getData('boxX') || 20;
    const boxY = this.dialogueContainer.getData('boxY') || 400;

    const promptSize = 10;
    const padding = 12;

    const endText = this.scene.add.text(
      boxX + padding,
      boxY + boxHeight - 18,
      '[Press SPACE or ESC to close]',
      {
        fontFamily: 'Georgia, serif',
        fontSize: `${promptSize}px`,
        color: '#888888',
        fontStyle: 'italic',
      }
    );
    endText.setScrollFactor(0);
    this.dialogueContainer.add(endText);

    this.scene.input.keyboard?.once('keydown-SPACE', () => {
      this.endDialogue();
    });
  }

  private selectResponse(response: DialogueResponse): void {
    // Apply effects
    if (response.effects) {
      this.applyEffects(response.effects);
    }

    // Check if this leads to trade
    if (response.nextNode === 'trade') {
      // Get the current NPC info from registry
      const currentNPC = this.scene.registry.get('currentDialogueNPC');
      const goods = currentNPC?.goods || ['good_pepper', 'good_cinnamon', 'good_cloves', 'good_silk', 'good_porcelain'];
      const npcName = currentNPC?.name || this.currentNode?.speaker || 'Merchant';
      
      this.scene.events.emit('openTrade', {
        npcName: npcName,
        goods: goods,
      });
      this.endDialogue();
      return;
    }

    // Advance to next node or end
    if (response.nextNode) {
      this.advanceToNode(response.nextNode);
    } else {
      this.endDialogue();
    }
  }

  private advanceToNode(nodeId: string): void {
    if (!this.currentTree) return;

    if (nodeId === 'end') {
      // Show the end node, then close
      const endNode = this.currentTree.nodes.get('end');
      if (endNode) {
        this.currentNode = endNode;
        this.displayCurrentNode();
      } else {
        this.endDialogue();
      }
      return;
    }

    const nextNode = this.currentTree.nodes.get(nodeId);
    if (nextNode) {
      // Apply node effects
      if (nextNode.effects) {
        this.applyEffects(nextNode.effects);
      }

      this.currentNode = nextNode;
      this.displayCurrentNode();
    } else {
      console.warn(`Node not found: ${nodeId}`);
      this.endDialogue();
    }
  }

  private applyEffects(effects: DialogueEffect[]): void {
    for (const effect of effects) {
      switch (effect.type) {
        case 'gold':
          this.scene.events.emit('goldChange', effect.value);
          break;
        case 'reputation':
          this.scene.events.emit('reputationChange', {
            target: effect.target,
            value: effect.value,
          });
          break;
        case 'item':
          this.scene.events.emit('itemGained', {
            item: effect.target,
            quantity: effect.value,
          });
          break;
        case 'flag':
          this.scene.events.emit('flagSet', {
            flag: effect.target,
            value: effect.value,
          });
          break;
      }
    }
  }

  public endDialogue(): void {
    this.isActive = false;
    this.currentTree = null;
    this.currentNode = null;

    // Remove ESC key handler
    this.scene.input.keyboard?.off('keydown-ESC', this.handleEscKey, this);

    if (this.dialogueContainer) {
      this.dialogueContainer.destroy();
      this.dialogueContainer = null;
    }

    this.scene.events.emit('dialogueEnd');
  }

  public isDialogueActive(): boolean {
    return this.isActive;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.endDialogue();
    this.dialogueTrees.clear();
  }
}
