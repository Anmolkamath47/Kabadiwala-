import { Request, Response, NextFunction } from 'express';
import { DealerGatewayService } from '../services/dealerGatewayService.js';
import { ScrapCategory } from '../types/index.js';

export class DealerController {
  static async getNearbyDealers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = req.query.radius ? parseFloat(req.query.radius as string) : 15;
      const category = req.query.category as ScrapCategory | undefined;

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({
          success: false,
          message: 'Valid latitude (lat) and longitude (lng) query parameters are required.',
        });
        return;
      }

      const dealers = await DealerGatewayService.getNearbyDealers(lat, lng, radius, category);

      res.status(200).json({
        success: true,
        data: {
          searchLocation: { lat, lng },
          radiusKm: radius,
          count: dealers.length,
          dealers,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDealerDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dealerId = req.params.dealerId as string;
      const dealer = await DealerGatewayService.getDealerById(dealerId);

      if (!dealer) {
        res.status(404).json({
          success: false,
          message: `Dealer with ID ${dealerId} not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: dealer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScrapCategories(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    const categories = [
      { id: 'E-Waste', name: 'Electronic Scrap & Devices', avgPrice: 65, unit: 'kg', icon: 'cpu', description: 'Old CPUs, broken laptops, smartphones, dead electronics' },
      { id: 'Paper', name: 'Paper & Books', avgPrice: 14, unit: 'kg', icon: 'newspaper', description: 'Newspaper, notebooks, cartons' },
      { id: 'Cardboard', name: 'Cardboard / Gatta', avgPrice: 10, unit: 'kg', icon: 'box', description: 'Corrugated cartons, packaging' },
      { id: 'Plastic', name: 'Plastics & Bottles', avgPrice: 18, unit: 'kg', icon: 'bottle', description: 'PET bottles, buckets, containers' },
      { id: 'Metal', name: 'Iron & Steel (Loha)', avgPrice: 34, unit: 'kg', icon: 'wrench', description: 'Iron grills, sheets, old utensils' },
      { id: 'Aluminium', name: 'Aluminium', avgPrice: 142, unit: 'kg', icon: 'utensils', description: 'Aluminium window sections, pots' },
      { id: 'Copper', name: 'Copper & Wire', avgPrice: 485, unit: 'kg', icon: 'zap', description: 'Motor wiring, electrical copper wires' },
      { id: 'Brass', name: 'Brass (Peetal)', avgPrice: 340, unit: 'kg', icon: 'shield', description: 'Brass utensils, locks, fittings' },
      { id: 'Glass', name: 'Glass Bottles', avgPrice: 4, unit: 'kg', icon: 'wine', description: 'Clean intact glass bottles' },
    ];

    res.status(200).json({
      success: true,
      data: categories,
    });
  }
}
