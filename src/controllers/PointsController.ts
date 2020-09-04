import { Request, Response } from 'express';
import knex from '../database/connection';


class PointsController {
    async index(request: Request, response: Response) {
        const { city, uf, items } = request.query;

        // console.log(city, uf, items);
        const parsedItems = String(items).split(',').map(item => Number(item.trim()));

        const points = await knex('points')
            .join('point_items', 'points.id', '=', 'points_items.point_id')
            .whereIn('point_items.item_id', parsedItems)
            .where('city', String(city))
            .where('uf', String(uf))
            .distinct()
            .select('points.*');

        const serializedPoints = points.map(point => {
            return {
                ...point,
                image_url: `http://localhost:3333/uploads/${point.image}`,
            }
        })

        return response.json(serializedPoints);
    }

    async show(request: Request, response: Response) {
        const { id } = request.params;

        const point = await knex('points').where('id', id).first();

        if (!point) {
            return response.status(400).json({ message: 'Point not found.' })
        }

        const serializedPoint = {
            ...point,
            image_url: `http://localhost:3333/uploads/${point.image}`,
        };


        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        return response.json({ point: serializedPoint, items });
    }

    async create(request: Request, response: Response) {
        //Recurso de Desestruturação do JS
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;

        const trx = await knex.transaction();

        const point = {
            image: request.file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
        }

        // Criar ponto de coleta (inserir informações da tabela)
        const insertedIds = await trx('points').insert(point);

        // Relacionamento com a tabela de ITEMS

        // Retornar os ids
        const point_id = insertedIds[0];

        const pointItems = items
            .split(',')
            .map((item: string) => Number(item.trim()))
            .map((item_id: number) => {
                return {
                    item_id,
                    point_id,
                }
            });

        //Inserir na tabela point_items cada item que foi inserido anteriormente
        await trx('point_items').insert(pointItems);

        await trx.commit();

        return response.json({
            id: point_id,
            ...point,
        });
    }
}

export default PointsController;