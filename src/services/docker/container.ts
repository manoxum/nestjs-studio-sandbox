import { exec } from 'child_process';

export function runContainer(containerName: string, flags: string[], image: string): Promise<string> {
    const cmd = `docker run -d --name ${containerName} ${flags.join(' ')} ${image}`;
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            resolve(stdout.trim());
        });
    });
}

export function stopContainer(containerName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`docker stop ${containerName}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            resolve(stdout);
        });
    });
}

export function startContainer(containerName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`docker start ${containerName}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            resolve(stdout);
        });
    });
}

export function removeContainer(containerName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`docker rm -f ${containerName}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            resolve(stdout);
        });
    });
}

export function listContainers(): Promise<{ name: string; status: string; image: string }[]> {
    return new Promise((resolve, reject) => {
        exec(`docker ps -a --filter "name=sub-sandbox-" --format "{{.Names}}\t{{.Status}}\t{{.Image}}"`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            const lines = stdout.trim().split('\n').filter(line => line);
            const containers = lines.map(line => {
                const [name, status, image] = line.split('\t');
                return { name, status, image };
            });
            resolve(containers);
        });
    });
}

export function listAllContainers(filterPrefix?: string[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
        exec(`docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.ID}}"`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            const lines = stdout.trim().split('\n').filter(l => l);
            let containers = lines.map(line => {
                const [name, status, image, id] = line.split('\t');
                return { name, status, image, id };
            });
            if (filterPrefix && filterPrefix.length > 0) {
                containers = containers.filter(c => filterPrefix.some(prefix => c.name.startsWith(prefix)));
            }
            resolve(containers);
        });
    });
}

export function inspectContainer(containerName: string): Promise<any> {
    return new Promise((resolve, reject) => {
        exec(`docker inspect ${containerName}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            try {
                const info = JSON.parse(stdout);
                resolve(info[0] || {});
            } catch (e) {
                reject(new Error('Failed to parse container info'));
            }
        });
    });
}

export function getContainerStatus(containerName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`docker inspect -f '{{.State.Status}}' ${containerName}`, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr));
            resolve(stdout.trim());
        });
    });
}

export function waitForContainerRunning(containerName: string, timeoutMs: number = 30000): Promise<void> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = async () => {
            try {
                const status = await getContainerStatus(containerName);
                if (status === 'running') return resolve();
                if (status === 'exited' || status === 'dead') {
                    return reject(new Error(`Container ${containerName} is ${status}`));
                }
            } catch { }
            if (Date.now() - start > timeoutMs) {
                return reject(new Error(`Timeout waiting for container ${containerName} to be running`));
            }
            setTimeout(check, 1000);
        };
        check();
    });
}