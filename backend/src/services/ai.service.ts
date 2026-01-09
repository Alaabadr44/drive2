import { OpenAI } from 'openai';
import { AppDataSource } from '../config/data-source';
import { Restaurant } from '../entities/Restaurant';
import { Menu } from '../entities/Menu';
import * as fs from 'fs';
import * as path from 'path';

export class AiService {
  private openai: OpenAI;
  private restaurantRepository = AppDataSource.getRepository(Restaurant);
  private menuRepository = AppDataSource.getRepository(Menu);

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeMenu(restaurantId: string): Promise<string> {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      relations: ['menus'],
    });

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    if (!restaurant.menus || restaurant.menus.length === 0) {
      throw new Error('No menus found for this restaurant');
    }

    console.log(`[AiService] Analyzing menu for ${restaurant.nameEn} with ${restaurant.menus.length} pages...`);

    // Prepare images for OpenAI
    // Assuming imageUrls are local paths starting with /uploads/..., we need to resolve them or send as base64 if local
    // Since GPT-4o Vision accepts URLs or Base64, and these are likely local dev URLs, we'll convert to Base64.
    
    const contentParts: any[] = [
      {
        type: "text",
        text: `You are an AI assistant for a restaurant called "${restaurant.nameEn}". 
        Analyze the following menu images and extract a structured, detailed knowledge base of all items.
        
        For each item component/section, list:
        - Category Name
        - Item Name
        - Price
        - Description (if available)
        - Options/Add-ons (if available)

        Also summarize any special offers, operating hours, or specific rules seen on the menu.
        
        The output should be clear text that you can use later to answer customer questions accurately.
        Do NOT use Markdown formatting like **bold** or tables. Just clear, readable text.`
      }
    ];

    for (const menu of restaurant.menus) {
        try {
            // Convert URL to filesystem path
            // imageUrl: /uploads/restaurants/ID_logo.jpg
            const relativePath = menu.imageUrl.startsWith('/') ? menu.imageUrl.slice(1) : menu.imageUrl;
            const fullPath = path.join(process.cwd(), 'public', relativePath);
            
            if (fs.existsSync(fullPath)) {
                const imageBuffer = fs.readFileSync(fullPath);
                const base64Image = imageBuffer.toString('base64');
                const extension = path.extname(fullPath).slice(1); // jpg, png
                const mimeType = extension === 'jpg' ? 'jpeg' : extension;

                contentParts.push({
                    type: "image_url",
                    image_url: {
                        "url": `data:image/${mimeType};base64,${base64Image}`
                    }
                });
                console.log(`[AiService] Added image ${menu.id} to payload`);
            } else {
                console.warn(`[AiService] Image file not found at ${fullPath}`);
            }
        } catch (e) {
            console.error(`[AiService] Error processing image ${menu.imageUrl}:`, e);
        }
    }

    if (contentParts.length <= 1) {
        throw new Error("No valid menu images could be processed.");
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
      max_tokens: 2000,
    });

    const analysis = response.choices[0].message.content;

    if (!analysis) {
        throw new Error("Failed to generate analysis from OpenAI");
    }

    // Save to Database
    restaurant.aiContext = analysis;
    await this.restaurantRepository.save(restaurant);

    console.log(`[AiService] Analysis complete and saved for ${restaurant.nameEn}`);
    return analysis;
  }
}
