abstract class Shape {
    abstract draw(ctx: CanvasRenderingContext2D): void;
}

class Circle extends Shape {
    private color = "#3498db"; // blue
    constructor(public x: number, public y: number, public radius: number) {
        super();
    }
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
class Triangle extends Shape {
    private color = "#e74c3c"; // red
    constructor(public x: number, public y: number, public size: number) {
        super();
    }
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size / 2);
        ctx.lineTo(this.x - this.size / 2, this.y + this.size / 2);
        ctx.lineTo(this.x + this.size / 2, this.y + this.size / 2);
        ctx.closePath();
        ctx.fill();
    }
}
class Square extends Shape {
    private color = "#2ecc71"; // green
    constructor(public x: number, public y: number, public size: number) {
        super();
    }
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}
class Pentagon extends Shape {
    private color = "#f1c40f"; // yellow
    constructor(public x: number, public y: number, public size: number) {
        super();
    }
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        const angle = (2 * Math.PI) / 5;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(this.x + this.size * Math.cos(i * angle - Math.PI / 2), this.y + this.size * Math.sin(i * angle - Math.PI / 2));
        }
        ctx.closePath();
        ctx.fill();
    }
}

export { Shape, Circle, Triangle, Square, Pentagon };