import { useEffect, useRef } from "react";

class BoidsModifier {
	constructor(boids, mouse, options = {}) {
		const {
			visualRange = 55,
			reduceFactor = 0.5,
			centeringFactor = 0.05,
			matchingFactor = 0.05,
			maxSpeed = 0.45,
			smoothSpeed = 0.3,
			acceleration = 0.035,
			minDistanceBoid = 20,
			avoidFactorBoid = 0.05,
			minDistanceMouse = 100,
			avoidFactorMouse = 0.025,
		} = options;

		this.boids = boids;
		this.mouse = mouse;
		this.visualRange = visualRange;
		this.reduceFactor = reduceFactor;
		this.centeringFactor = centeringFactor;
		this.matchingFactor = matchingFactor;
		this.maxSpeed = maxSpeed;
		this.smoothSpeed = smoothSpeed;
		this.acceleration = acceleration;
		this.minDistanceBoid = minDistanceBoid;
		this.avoidFactorBoid = avoidFactorBoid;
		this.minDistanceMouse = minDistanceMouse;
		this.avoidFactorMouse = avoidFactorMouse;
	}

	distance(boid1, boid2) {
		return Math.sqrt((boid1.position.x - boid2.position.x) ** 2 + (boid1.position.y - boid2.position.y) ** 2);
	}

	coherence(boid) {
		let centerX = 0;
		let centerY = 0;
		let numNeighbors = 0;

		for (const other of this.boids) {
			if (this.distance(boid, other) < this.visualRange) {
				centerX += other.position.x;
				centerY += other.position.y;
				numNeighbors++;
			}
		}

		if (numNeighbors > 0) {
			centerX = centerX / numNeighbors;
			centerY = centerY / numNeighbors;

			const target = { x: centerX, y: centerY };
			const steering = this.steer(boid.position, target);

			boid.velocity.x += steering.x * this.centeringFactor;
			boid.velocity.y += steering.y * this.centeringFactor;
		}
	}

	steer(current, target) {
		const desiredDir = target - current;
		const desired = this.normalize(desiredDir);

		const steer = desired - current;
		const normalizedSteer = this.normalize(steer.x, steer.y);

		return this.applyAcceleration(
			normalizedSteer.x * this.acceleration,
			normalizedSteer.y * this.acceleration
		);
	}

	applyAcceleration(dx, dy) {
		const speed = Math.hypot(dx ** 2, dy ** 2);
		if (speed > this.maxSpeed) {
			return {
				x: (dx / speed) * this.maxSpeed,
				y: (dy / speed) * this.maxSpeed,
			};
		}
		return { x: dx, y: dy };
	}

	normalize = (x, y) => {
		const magnitude = Math.hypot(x, y);
		if (magnitude > 0) {
			return { x: (x / magnitude), y: (y / magnitude) };
		} else {
			return { x: 0, y: 0 };
		}
	};

	avoidOthers(boid) {
		let moveX = 0;
		let moveY = 0;

		for (const other of this.boids) {
			const distance = this.distance(boid, other);
			if (other !== boid && distance < this.minDistanceBoid) {
				moveX += boid.position.x - other.position.x;
				moveY += boid.position.y - other.position.y;
			}
		}

		const avoidVector = this.normalize(moveX, moveY);
		boid.velocity.x += avoidVector.x * this.avoidFactorBoid * this.reduceFactor;
		boid.velocity.y += avoidVector.y * this.avoidFactorBoid * this.reduceFactor;
	}

	matchVelocity(boid) {
		let avgDX = 0;
		let avgDY = 0;
		let numNeighbors = 0;

		for (const other of this.boids) {
			if (this.distance(boid, other) < this.visualRange) {
				avgDX += other.velocity.x;
				avgDY += other.velocity.y;
				numNeighbors++;
			}
		}

		if (numNeighbors > 0) {
			avgDX /= numNeighbors;
			avgDY /= numNeighbors;

			boid.velocity.x += (avgDX - boid.velocity.x) * this.matchingFactor;
			boid.velocity.y += (avgDY - boid.velocity.y) * this.matchingFactor;
		}

		const speed = Math.sqrt(boid.velocity.x ** 2 + boid.velocity.y ** 2);
		if (speed > this.maxSpeed) {
			boid.velocity.x = (boid.velocity.x / speed) * this.maxSpeed;
			boid.velocity.y = (boid.velocity.y / speed) * this.maxSpeed;
		} else if (speed < this.maxSpeed * 0.5) {
			boid.velocity.x = (boid.velocity.x / speed) * this.maxSpeed * 0.75;
			boid.velocity.y = (boid.velocity.y / speed) * this.maxSpeed * 0.75;
		}
	}

	avoidMouse(boid) {
		const mouse = this.mouse.current;
		const mouseParsed = {
			position: { x: mouse.x, y: mouse.y },
		};

		const mouseDistance = this.distance(boid, mouseParsed);
		if (mouseDistance < this.minDistanceMouse) {
			const moveX = boid.position.x - mouse.x;
			const moveY = boid.position.y - mouse.y;

			const avoidVector = this.normalize(moveX, moveY);
			boid.velocity.x += avoidVector.x * this.avoidFactorMouse;
			boid.velocity.y += avoidVector.y * this.avoidFactorMouse;
		}
	}

	applyBehaviors(boid) {
		this.coherence(boid);
		this.avoidOthers(boid);
		this.avoidMouse(boid);
		this.matchVelocity(boid);
	}
}

const Boids = ({ numBoids = 50, size = 8, options = {} }) => {
	const canvasRef = useRef(null);
	const mouseRef = useRef({ x: null, y: null });

	useEffect(() => {
		// Refers to the canvas tag
		// Canvas defines a bitmapped area which we set as the current windows width and height
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		// Lower the speed for mobile
		const mobileOptions = {
			...options,
			maxSpeed: window.innerWidth < 768 ? 0.3 : options.maxSpeed
		};

		const boids = [];
		const boidsModifier = new BoidsModifier(boids, mouseRef, mobileOptions);

		// Arrow function that creates a boid on a random point on the canvas with a random velocity and angle
		const createBoid = () => ({
			position: { x: Math.random() * canvas.width, y: Math.random() * canvas.height },
			velocity: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
			angle: Math.random() * 2,
		});

		const drawBoid = (boid) => {
			// Returns the angle (in radians) from the X axis to a point.
			// Set the direction the boid is facing based on its velocity
			boid.angle = Math.atan2(boid.velocity.y, boid.velocity.x);

			const points = [
				{ x: boid.position.x + size * Math.cos(boid.angle), y: boid.position.y + size * Math.sin(boid.angle) },
				{ x: boid.position.x + size * Math.cos(boid.angle + (2 * Math.PI) / 3), y: boid.position.y + size * Math.sin(boid.angle + (2 * Math.PI) / 3) },
				{ x: boid.position.x + size * Math.cos(boid.angle - (2 * Math.PI) / 3), y: boid.position.y + size * Math.sin(boid.angle - (2 * Math.PI) / 3) },
			];

			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);	// Starting point of the triangle
			ctx.lineTo(points[1].x, points[1].y);
			ctx.lineTo(points[2].x, points[2].y);
			ctx.closePath();
			ctx.fillStyle = "rgb(56, 66, 92)";
			ctx.fill();
		};

		const updateBoids = () => {
			for (const boid of boids) {
				// Update the position based on the boids velocity
				boid.position.x += boid.velocity.x;
				boid.position.y += boid.velocity.y;
				boidsModifier.applyBehaviors(boid);

				if (boid.position.x > canvas.width + size) boid.position.x = -size;
				if (boid.position.x < -size) boid.position.x = canvas.width + size;
				if (boid.position.y > canvas.height + size) boid.position.y = -size;
				if (boid.position.y < -size) boid.position.y = canvas.height + size;
			}
		};

		for (let i = 0; i < numBoids; i++) {
			boids.push(createBoid());
		}

		const render = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (const boid of boids) {
				drawBoid(boid);
			}

			updateBoids();
			requestAnimationFrame(render);
		};
		render();

		window.addEventListener("mousemove", (e) => {
			mouseRef.current.x = e.clientX;
			mouseRef.current.y = e.clientY;
		});

		window.addEventListener("resize", () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		});
	}, []);

	return (
		<canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }} />
	);
};

export default Boids;
