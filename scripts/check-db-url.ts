
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (url) {
    try {
        const parsed = new URL(url);
        console.log(`Protocol: ${parsed.protocol}`);
        console.log(`Host: ${parsed.host}`);
    } catch (e) {
        console.log('Could not parse DATABASE_URL');
        console.log(url ? url.substring(0, 10) + '...' : 'undefined');
    }
} else {
    console.log('DATABASE_URL is not set');
}
